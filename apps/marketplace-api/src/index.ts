import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import type { CapsuleRecord, ChainReconciliationSummary, DocumentListing, PurchaseReceipt } from "@capsule/shared-types";
import { z } from "zod";
import { createMarketplaceRepository } from "./postgres.js";
import { createConfiguredSuiReconciler } from "./reconciliation.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const port = Number(process.env.MARKETPLACE_PORT ?? 4000);
const app = express();
const store = await createMarketplaceRepository();
const reconciler = createConfiguredSuiReconciler();

const rangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
}).refine(({ start, end }) => start <= end, "Line range start must not exceed end");

const fragmentSchema = z.object({
  range: rangeSchema,
  sealIdentity: z.string().regex(/^[\da-f]+$/i),
  encryptedBlobId: z.string().min(1),
  walrusBlobObjectId: z.string().optional(),
  suiFragmentId: z.string().optional(),
  registrationTx: z.string().optional(),
});

const listingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  publisher: z.string().min(1),
  category: z.string().min(1),
  lineCount: z.number().int().positive(),
  rootHash: z.string().regex(/^[\da-f]{64}$/i),
  encryptedBlobId: z.string().min(1),
  walrusBlobObjectId: z.string().optional(),
  suiDocumentId: z.string().optional(),
  documentTx: z.string().optional(),
  pricePerLineMist: z.string().regex(/^\d+$/),
  publicationMode: z.enum(["host-generated", "publisher-sealed-fragments"]).optional(),
  fragments: z.array(fragmentSchema).optional(),
  createdAt: z.string().datetime(),
});

const purchaseSchema = z.object({
  documentId: z.string().min(1),
  buyer: z.string().min(1),
  range: rangeSchema,
  paymentTx: z.string().optional(),
  suiPurchaseId: z.string().optional(),
  suiFragmentId: z.string().optional(),
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
  response.json({
    service: "marketplace-api",
    ok: true,
    repository: store.repositoryName,
    reconciliation: Boolean(reconciler),
  });
});

app.get("/documents", async (_request, response) => {
  response.json(await store.listDocuments());
});

app.get("/documents/:id", async (request, response) => {
  const document = await store.getDocument(request.params.id);
  if (!document) {
    response.status(404).json({ error: "Document listing not found" });
    return;
  }
  response.json(document);
});

// Content never enters this service; only the disclosure host registers listings.
app.post("/internal/documents", async (request, response) => {
  const result = listingSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid listing" });
    return;
  }
  await store.registerDocument(result.data as DocumentListing);
  response.status(201).json(result.data);
});

app.post("/purchase", async (request, response) => {
  const result = purchaseSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid purchase" });
    return;
  }
  const listing = await store.getDocument(result.data.documentId);
  if (!listing) {
    response.status(404).json({ error: "Document listing not found" });
    return;
  }
  if (result.data.range.end >= listing.lineCount) {
    response.status(400).json({ error: "Purchased range is outside this document" });
    return;
  }
  if (listing.publicationMode === "publisher-sealed-fragments") {
    const fragment = listing.fragments?.find((item) =>
      item.suiFragmentId === result.data.suiFragmentId &&
      item.range.start === result.data.range.start &&
      item.range.end === result.data.range.end
    );
    if (!fragment?.suiFragmentId) {
      response.status(400).json({ error: "Purchase must target a registered encrypted fragment" });
      return;
    }
  }
  const requiresChainPayment = process.env.PROTOCOL_MODE === "testnet" && Boolean(listing.suiDocumentId);
  if (requiresChainPayment && (!result.data.paymentTx || !result.data.suiPurchaseId)) {
    response.status(400).json({ error: "Testnet disclosures require an on-chain Sui purchase receipt" });
    return;
  }
  const selectedLines = BigInt(result.data.range.end - result.data.range.start + 1);
  const receipt: PurchaseReceipt = {
    id: randomUUID(),
    documentId: listing.id,
    buyer: result.data.buyer,
    range: result.data.range,
    amountMist: (selectedLines * BigInt(listing.pricePerLineMist)).toString(),
    paymentTx: result.data.paymentTx ?? `demo-payment-${randomUUID()}`,
    suiPurchaseId: result.data.suiPurchaseId,
    suiFragmentId: result.data.suiFragmentId,
    createdAt: new Date().toISOString(),
  };
  await store.addPurchase(receipt);
  response.status(201).json(receipt);
});

app.get("/purchases/:id", async (request, response) => {
  const purchase = await store.getPurchase(request.params.id);
  if (!purchase) {
    response.status(404).json({ error: "Purchase receipt not found" });
    return;
  }
  response.json(purchase);
});

app.post("/internal/capsules", async (request, response) => {
  const stored = request.body as CapsuleRecord;
  const capsuleId = "capsule" in stored ? stored.capsule?.capsuleId : stored.summary?.capsuleId;
  if (!capsuleId || !stored.capsuleBlobId) {
    response.status(400).json({ error: "Invalid capsule record" });
    return;
  }
  await store.addCapsule(stored);
  response.status(201).json(stored);
});

app.get("/capsules", async (_request, response) => {
  response.json(await store.listCapsules());
});

async function reconcileAllChainRecords(): Promise<ChainReconciliationSummary> {
  if (!reconciler) {
    throw new Error("SUI_PACKAGE_ID is required for chain reconciliation");
  }
  const summary = await reconciler.reconcile(
    await store.listDocuments(),
    await store.listPurchases(),
    await store.listCapsules(),
  );
  await store.saveReconciliations(summary.records);
  return summary;
}

app.post("/internal/reconcile", async (_request, response) => {
  if (!reconciler) {
    response.status(503).json({ error: "SUI_PACKAGE_ID is required for chain reconciliation" });
    return;
  }
  response.json(await reconcileAllChainRecords());
});

app.get("/reconciliations", async (_request, response) => {
  response.json(await store.listReconciliations());
});

const reconciliationIntervalMs = Number(process.env.RECONCILIATION_INTERVAL_MS ?? 0);
if (reconciler && Number.isFinite(reconciliationIntervalMs) && reconciliationIntervalMs > 0) {
  setInterval(() => {
    void reconcileAllChainRecords().catch((error) => {
      console.error("Marketplace Sui reconciliation failed", error);
    });
  }, reconciliationIntervalMs).unref();
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Marketplace request failed", error);
  response.status(500).json({ error: error instanceof Error ? error.message : "Marketplace request failed" });
});

app.listen(port, () => {
  console.log(`Capsule marketplace API listening on http://localhost:${port} (${store.repositoryName})`);
});
