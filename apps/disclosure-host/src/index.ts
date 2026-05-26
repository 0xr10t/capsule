import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { buildMerkleTree, generateRangeProof, splitLines, verifyCapsule } from "@capsule/sdk-typescript";
import type {
  DisclosureCapsule,
  DocumentListing,
  EncryptedDocumentEnvelope,
  PurchaseReceipt,
  StoredCapsule,
} from "@capsule/shared-types";
import { z } from "zod";
import { decryptDocument, encryptDocument, signCapsule } from "./crypto.js";
import { createStorageProvider } from "./storage/index.js";

const port = Number(process.env.DISCLOSURE_HOST_PORT ?? 4001);
const marketplaceUrl = process.env.MARKETPLACE_API_URL ?? "http://localhost:4000";
const app = express();
const storage = createStorageProvider();
const documentKeys = new Map<string, Buffer>();

const publishSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  publisher: z.string().min(1),
  category: z.string().min(1),
  pricePerLineMist: z.string().regex(/^\d+$/),
  content: z.string().min(1),
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
  response.json({ service: "disclosure-host", ok: true, storage: process.env.STORAGE_DRIVER ?? "memory" });
});

app.post("/documents/upload", async (request, response) => {
  try {
    const input = publishSchema.parse(request.body);
    const lines = splitLines(input.content);
    const merkle = await buildMerkleTree(lines);
    const encrypted = encryptDocument(input.content);
    const blob = await storage.uploadBlob(Buffer.from(JSON.stringify(encrypted.envelope)));
    const listing: DocumentListing = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      publisher: input.publisher,
      category: input.category,
      lineCount: lines.length,
      rootHash: merkle.rootHash,
      encryptedBlobId: blob.blobId,
      pricePerLineMist: input.pricePerLineMist,
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

app.post("/disclosure/generate", async (request, response) => {
  try {
    const { purchaseId } = z.object({ purchaseId: z.string().min(1) }).parse(request.body);
    const purchase = await marketplaceRequest<PurchaseReceipt>(`/purchases/${purchaseId}`);
    const listing = await marketplaceRequest<DocumentListing>(`/documents/${purchase.documentId}`);
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
      buyer: purchase.buyer,
      publisher: listing.publisher,
    };
    const capsule: DisclosureCapsule = { ...unsignedCapsule, ...signCapsule(unsignedCapsule) };
    const capsuleBlob = await storage.uploadBlob(Buffer.from(JSON.stringify(capsule)));
    const stored: StoredCapsule = { capsule, capsuleBlobId: capsuleBlob.blobId };
    await marketplaceRequest<StoredCapsule>("/internal/capsules", {
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
    const capsule = JSON.parse(Buffer.from(bytes).toString("utf8")) as DisclosureCapsule;
    response.json({ capsule, capsuleBlobId: request.params.blobId } satisfies StoredCapsule);
  } catch (error) {
    response.status(404).json({ error: error instanceof Error ? error.message : "Capsule not found" });
  }
});

app.post("/verify", async (request, response) => {
  const capsule = request.body as DisclosureCapsule;
  response.json(await verifyCapsule(capsule));
});

app.listen(port, () => {
  console.log(`Capsule disclosure host listening on http://localhost:${port}`);
});

