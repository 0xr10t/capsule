import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { buildMerkleTree, generateRangeProof, splitLines, verifyCapsule } from "@capsule/sdk-typescript";
import type {
  CapsuleRecord,
  CapsuleSummary,
  DisclosureCapsule,
  DocumentListing,
  EncryptedDocumentEnvelope,
  PublishedFragment,
  PurchaseReceipt,
  PublishSealedDocumentRequest,
  SealedCapsuleEnvelope,
} from "@capsule/shared-types";
import { z } from "zod";
import { decryptDocument, encryptDocument, signCapsule } from "./crypto.js";
import { createStorageProvider } from "./storage/index.js";
import { createSuiAnchorProvider } from "./sui.js";
import { createCapsuleSealer } from "./seal.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const port = Number(process.env.DISCLOSURE_HOST_PORT ?? 4001);
const marketplaceUrl = process.env.MARKETPLACE_API_URL ?? "http://localhost:4000";
const app = express();
const sui = createSuiAnchorProvider();
const storage = createStorageProvider(sui?.address);
const capsuleSealer = createCapsuleSealer();
const documentKeys = new Map<string, Buffer>();

const publishSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  publisher: z.string().min(1),
  category: z.string().min(1),
  pricePerLineMist: z.string().regex(/^\d+$/),
  content: z.string().min(1),
});

const lineRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
}).refine(({ start, end }) => start <= end, "Fragment range start must not exceed end");

const publishSealedSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  publisher: z.string().min(1),
  category: z.string().min(1),
  pricePerLineMist: z.string().regex(/^\d+$/),
  lineCount: z.number().int().positive(),
  rootHash: z.string().regex(/^[\da-f]{64}$/i),
  fragments: z.array(z.object({
    range: lineRangeSchema,
    envelope: z.object({
      version: z.literal("1"),
      algorithm: z.literal("SEAL"),
      packageId: z.string().min(1),
      identity: z.string().regex(/^[\da-f]+$/i),
      encryptedObject: z.string().min(1),
    }),
  })).min(1),
});

async function marketplaceRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${marketplaceUrl}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "Marketplace service request failed");
  }
  return result;
}

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/health", (_request, response) => {
  response.json({
    service: "disclosure-host",
    ok: true,
    mode: process.env.PROTOCOL_MODE ?? "demo",
    storage: process.env.STORAGE_DRIVER ?? "memory",
    suiSigner: sui?.address,
    packageId: process.env.SUI_PACKAGE_ID,
    sealedCapsules: Boolean(capsuleSealer),
  });
});

app.post("/documents/upload", async (request, response) => {
  try {
    const input = publishSchema.parse(request.body);
    const lines = splitLines(input.content);
    const merkle = await buildMerkleTree(lines);
    const encrypted = encryptDocument(input.content);
    const blob = await storage.uploadBlob(Buffer.from(JSON.stringify(encrypted.envelope)));
    const chainRecord = sui
      ? await sui.registerDocument(merkle.rootHash, blob.blobId, lines.length, input.pricePerLineMist)
      : undefined;
    const listing: DocumentListing = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      publisher: sui?.address ?? input.publisher,
      category: input.category,
      lineCount: lines.length,
      rootHash: merkle.rootHash,
      encryptedBlobId: blob.blobId,
      walrusBlobObjectId: blob.suiObjectId,
      suiDocumentId: chainRecord?.objectId,
      documentTx: chainRecord?.transactionDigest,
      pricePerLineMist: input.pricePerLineMist,
      publicationMode: "host-generated",
      createdAt: new Date().toISOString(),
    };
    await marketplaceRequest<DocumentListing>("/internal/documents", {
      method: "POST",
      body: JSON.stringify(listing),
    });
    documentKeys.set(listing.id, encrypted.key);
    response.status(201).json(listing);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Document upload failed" });
  }
});

app.post("/documents/upload-sealed-fragments", async (request, response) => {
  try {
    if (!sui || process.env.PROTOCOL_MODE !== "testnet") {
      throw new Error("Publisher-sealed fragments require Sui testnet mode");
    }
    const input = publishSealedSchema.parse(request.body) as PublishSealedDocumentRequest;
    if (input.fragments.some(({ range }) => range.end >= input.lineCount)) {
      throw new Error("A fragment range is outside this document");
    }
    if (input.fragments.some(({ envelope }) => envelope.packageId !== process.env.SUI_PACKAGE_ID)) {
      throw new Error("Sealed fragments must use the configured Capsule policy package");
    }
    const orderedRanges = input.fragments.map(({ range }) => range).sort((left, right) => left.start - right.start);
    if (orderedRanges.some((range, index) => index > 0 && range.start <= orderedRanges[index - 1]!.end)) {
      throw new Error("Sealed fragment ranges must not overlap");
    }
    const uploaded: PublishedFragment[] = [];
    for (const fragment of input.fragments) {
      const blob = await storage.uploadBlob(Buffer.from(JSON.stringify(fragment.envelope)));
      uploaded.push({
        range: fragment.range,
        sealIdentity: fragment.envelope.identity,
        encryptedBlobId: blob.blobId,
        walrusBlobObjectId: blob.suiObjectId,
      });
    }
    const manifestBlob = await storage.uploadBlob(Buffer.from(JSON.stringify({
      version: "1",
      publicationMode: "publisher-sealed-fragments",
      rootHash: input.rootHash,
      fragments: uploaded,
    })));
    const chainDocument = await sui.registerDocument(
      input.rootHash,
      manifestBlob.blobId,
      input.lineCount,
      input.pricePerLineMist,
    );
    for (const fragment of uploaded) {
      const registration = await sui.registerFragment(
        chainDocument.objectId,
        fragment.sealIdentity,
        fragment.range.start,
        fragment.range.end,
        fragment.encryptedBlobId,
      );
      fragment.suiFragmentId = registration.objectId;
      fragment.registrationTx = registration.transactionDigest;
    }
    const listing: DocumentListing = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      publisher: sui.address,
      category: input.category,
      lineCount: input.lineCount,
      rootHash: input.rootHash,
      encryptedBlobId: manifestBlob.blobId,
      walrusBlobObjectId: manifestBlob.suiObjectId,
      suiDocumentId: chainDocument.objectId,
      documentTx: chainDocument.transactionDigest,
      pricePerLineMist: input.pricePerLineMist,
      publicationMode: "publisher-sealed-fragments",
      fragments: uploaded,
      createdAt: new Date().toISOString(),
    };
    await marketplaceRequest<DocumentListing>("/internal/documents", {
      method: "POST",
      body: JSON.stringify(listing),
    });
    response.status(201).json(listing);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Sealed document upload failed" });
  }
});

app.post("/disclosure/generate", async (request, response) => {
  try {
    const { purchaseId } = z.object({ purchaseId: z.string().min(1) }).parse(request.body);
    const purchase = await marketplaceRequest<PurchaseReceipt>(`/purchases/${purchaseId}`);
    const listing = await marketplaceRequest<DocumentListing>(`/documents/${purchase.documentId}`);
    if (sui && listing.suiDocumentId) {
      if (!purchase.suiPurchaseId) {
        throw new Error("An on-chain Sui Purchase object is required before disclosure");
      }
      const chainPurchase = await sui.purchase(purchase.suiPurchaseId, purchase.paymentTx);
      if (
        chainPurchase.documentId !== listing.suiDocumentId ||
        chainPurchase.buyer !== purchase.buyer ||
        chainPurchase.lineStart !== purchase.range.start ||
        chainPurchase.lineEnd !== purchase.range.end ||
        chainPurchase.amountMist !== purchase.amountMist ||
        chainPurchase.paymentTx !== purchase.paymentTx
      ) {
        throw new Error("Sui Purchase object does not authorize this disclosure request");
      }
      if (chainPurchase.consumed) {
        throw new Error("Sui Purchase object has already been disclosed");
      }
    }
    if (listing.publicationMode === "publisher-sealed-fragments") {
      const fragment = listing.fragments?.find((item) =>
        item.suiFragmentId === purchase.suiFragmentId &&
        item.range.start === purchase.range.start &&
        item.range.end === purchase.range.end
      );
      if (!sui || !listing.suiDocumentId || !purchase.suiPurchaseId || !fragment?.suiFragmentId) {
        throw new Error("Paid purchase does not identify an available sealed fragment");
      }
      const envelopeBytes = await storage.fetchBlob(fragment.encryptedBlobId);
      const envelope = JSON.parse(Buffer.from(envelopeBytes).toString("utf8")) as Omit<
        SealedCapsuleEnvelope,
        "suiPurchaseId" | "accessPolicy" | "suiFragmentId"
      >;
      const summary: CapsuleSummary = {
        capsuleId: randomUUID(),
        documentId: listing.id,
        documentBlobId: listing.encryptedBlobId,
        rootHash: listing.rootHash,
        lineRange: purchase.range,
        createdAt: new Date().toISOString(),
        paymentTx: purchase.paymentTx,
        suiPurchaseId: purchase.suiPurchaseId,
        buyer: purchase.buyer,
        publisher: listing.publisher,
        suiDocumentId: listing.suiDocumentId,
        suiFragmentId: fragment.suiFragmentId,
      };
      const sealedCapsule: SealedCapsuleEnvelope = {
        ...envelope,
        suiPurchaseId: purchase.suiPurchaseId,
        accessPolicy: "published-fragment",
        suiFragmentId: fragment.suiFragmentId,
      };
      const deliveryBlob = await storage.uploadBlob(Buffer.from(JSON.stringify({ summary, sealedCapsule })));
      const chainRecord = await sui.recordFragmentDisclosure(
        listing.suiDocumentId,
        fragment.suiFragmentId,
        purchase.suiPurchaseId,
        deliveryBlob.blobId,
      );
      const stored: CapsuleRecord = {
        summary,
        sealedCapsule,
        capsuleBlobId: deliveryBlob.blobId,
        walrusBlobObjectId: deliveryBlob.suiObjectId,
        suiDisclosureId: chainRecord.objectId,
        disclosureTx: chainRecord.transactionDigest,
      };
      await marketplaceRequest<CapsuleRecord>("/internal/capsules", {
        method: "POST",
        body: JSON.stringify(stored),
      });
      response.status(201).json(stored);
      return;
    }
    const key = documentKeys.get(listing.id);
    if (!key) {
      throw new Error("Publisher key is not loaded by this disclosure host");
    }
    const encryptedBytes = await storage.fetchBlob(listing.encryptedBlobId);
    const envelope = JSON.parse(Buffer.from(encryptedBytes).toString("utf8")) as EncryptedDocumentEnvelope;
    const lines = splitLines(decryptDocument(envelope, key));
    const merkle = await buildMerkleTree(lines);
    if (merkle.rootHash !== listing.rootHash) {
      throw new Error("Stored document does not match its committed Merkle root");
    }
    const proof = await generateRangeProof(lines, purchase.range.start, purchase.range.end);
    const unsignedCapsule = {
      version: "1" as const,
      capsuleId: randomUUID(),
      documentId: listing.id,
      documentBlobId: listing.encryptedBlobId,
      rootHash: listing.rootHash,
      lineRange: purchase.range,
      disclosedContent: lines.slice(purchase.range.start, purchase.range.end + 1),
      proof,
      createdAt: new Date().toISOString(),
      paymentTx: purchase.paymentTx,
      suiPurchaseId: purchase.suiPurchaseId,
      buyer: purchase.buyer,
      publisher: listing.publisher,
      suiDocumentId: listing.suiDocumentId,
    };
    const capsule: DisclosureCapsule = { ...unsignedCapsule, ...signCapsule(unsignedCapsule) };
    const summary: CapsuleSummary | undefined = purchase.suiPurchaseId
      ? {
          capsuleId: capsule.capsuleId,
          documentId: capsule.documentId,
          documentBlobId: capsule.documentBlobId,
          rootHash: capsule.rootHash,
          lineRange: capsule.lineRange,
          createdAt: capsule.createdAt,
          paymentTx: capsule.paymentTx,
          suiPurchaseId: purchase.suiPurchaseId,
          buyer: capsule.buyer,
          publisher: capsule.publisher,
          suiDocumentId: capsule.suiDocumentId,
        }
      : undefined;
    const sealedCapsule = capsuleSealer && purchase.suiPurchaseId
      ? await capsuleSealer.encryptCapsule(capsule, purchase.suiPurchaseId)
      : undefined;
    const walrusPayload = sealedCapsule && summary ? { summary, sealedCapsule } : capsule;
    const capsuleBlob = await storage.uploadBlob(Buffer.from(JSON.stringify(walrusPayload)));
    const chainRecord = sui && listing.suiDocumentId
      ? await sui.recordDisclosure(
          listing.suiDocumentId,
          purchase.suiPurchaseId!,
          capsuleBlob.blobId,
        )
      : undefined;
    const stored: CapsuleRecord = sealedCapsule && summary
      ? {
          summary,
          sealedCapsule,
          capsuleBlobId: capsuleBlob.blobId,
          walrusBlobObjectId: capsuleBlob.suiObjectId,
          suiDisclosureId: chainRecord?.objectId,
          disclosureTx: chainRecord?.transactionDigest,
        }
      : {
          capsule,
          capsuleBlobId: capsuleBlob.blobId,
          walrusBlobObjectId: capsuleBlob.suiObjectId,
          suiDisclosureId: chainRecord?.objectId,
          disclosureTx: chainRecord?.transactionDigest,
        };
    await marketplaceRequest<CapsuleRecord>("/internal/capsules", {
      method: "POST",
      body: JSON.stringify(stored),
    });
    response.status(201).json(stored);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Disclosure generation failed" });
  }
});

app.get("/capsules/:blobId", async (request, response) => {
  try {
    const bytes = await storage.fetchBlob(request.params.blobId);
    const payload = JSON.parse(Buffer.from(bytes).toString("utf8")) as DisclosureCapsule | {
      summary: CapsuleSummary;
      sealedCapsule: SealedCapsuleEnvelope;
    };
    if ("sealedCapsule" in payload) {
      response.json({ ...payload, capsuleBlobId: request.params.blobId } satisfies CapsuleRecord);
      return;
    }
    response.json({ capsule: payload, capsuleBlobId: request.params.blobId } satisfies CapsuleRecord);
  } catch (error) {
    response.status(404).json({ error: error instanceof Error ? error.message : "Capsule not found" });
  }
});

app.post("/verify", async (request, response) => {
  const capsule = request.body as DisclosureCapsule;
  const localResult = await verifyCapsule(capsule);
  if (!localResult.valid || !capsule.suiDocumentId || !sui) {
    response.json({ ...localResult, anchored: false, suiDocumentId: capsule.suiDocumentId });
    return;
  }
  try {
    const chainRoot = await sui.documentRoot(capsule.suiDocumentId);
    response.json({
      ...localResult,
      valid: chainRoot === capsule.rootHash,
      anchored: chainRoot === capsule.rootHash,
      chainRoot,
      suiDocumentId: capsule.suiDocumentId,
      reason: chainRoot === capsule.rootHash ? undefined : "Capsule root does not match its Sui Document anchor",
    });
  } catch (error) {
    response.json({
      ...localResult,
      valid: false,
      anchored: false,
      suiDocumentId: capsule.suiDocumentId,
      reason: error instanceof Error ? error.message : "Sui anchor verification failed",
    });
  }
});

app.listen(port, () => {
  console.log(`Capsule disclosure host listening on http://localhost:${port}`);
});
