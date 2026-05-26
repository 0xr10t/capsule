import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import type { DocumentListing, PurchaseReceipt, StoredCapsule } from "@capsule/shared-types";
import { z } from "zod";
import { MarketplaceStore } from "./store.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const port = Number(process.env.MARKETPLACE_PORT ?? 4000);
const app = express();
const store = new MarketplaceStore();

const rangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
}).refine(({ start, end }) => start <= end, "Line range start must not exceed end");

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
  createdAt: z.string().datetime(),
});

const purchaseSchema = z.object({
  documentId: z.string().min(1),
  buyer: z.string().min(1),
  range: rangeSchema,
  paymentTx: z.string().optional(),
  suiPurchaseId: z.string().optional(),
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
  response.json({ service: "marketplace-api", ok: true, repository: "memory" });
});

app.get("/documents", (_request, response) => {
  response.json(store.listDocuments());
});

app.get("/documents/:id", (request, response) => {
  const document = store.getDocument(request.params.id);
  if (!document) {
    response.status(404).json({ error: "Document listing not found" });
    return;
  }
  response.json(document);
});

// Content never enters this service; only the disclosure host registers listings.
app.post("/internal/documents", (request, response) => {
  const result = listingSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid listing" });
    return;
  }
  store.registerDocument(result.data as DocumentListing);
  response.status(201).json(result.data);
});

app.post("/purchase", (request, response) => {
  const result = purchaseSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid purchase" });
    return;
  }
  const listing = store.getDocument(result.data.documentId);
  if (!listing) {
    response.status(404).json({ error: "Document listing not found" });
    return;
  }
  if (result.data.range.end >= listing.lineCount) {
    response.status(400).json({ error: "Purchased range is outside this document" });
    return;
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
    createdAt: new Date().toISOString(),
  };
  store.addPurchase(receipt);
  response.status(201).json(receipt);
});

app.get("/purchases/:id", (request, response) => {
  const purchase = store.getPurchase(request.params.id);
  if (!purchase) {
    response.status(404).json({ error: "Purchase receipt not found" });
    return;
  }
  response.json(purchase);
});

app.post("/internal/capsules", (request, response) => {
  const stored = request.body as StoredCapsule;
  if (!stored?.capsule?.capsuleId || !stored.capsuleBlobId) {
    response.status(400).json({ error: "Invalid capsule record" });
    return;
  }
  store.addCapsule(stored);
  response.status(201).json(stored);
});

app.get("/capsules", (_request, response) => {
  response.json(store.listCapsules());
});

app.listen(port, () => {
  console.log(`Capsule marketplace API listening on http://localhost:${port}`);
});
