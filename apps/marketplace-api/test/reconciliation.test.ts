import type { CapsuleRecord, DocumentListing, PurchaseReceipt } from "@capsule/shared-types";
import { describe, expect, it } from "vitest";
import { SuiReconciler, type PublicObjectReader } from "../src/reconciliation.js";

const packageId = "0xpackage";
const documentObjectId = "0xdocument";
const fragmentObjectId = "0xfragment";
const purchaseObjectId = "0xpurchase";
const disclosureObjectId = "0xdisclosure";

function bytes(value: string): number[] {
  return Array.from(Buffer.from(value, "utf8"));
}

function object(type: string, fields: Record<string, unknown>, previousTransaction: string) {
  return {
    data: {
      content: { dataType: "moveObject", type: `${packageId}::capsule::${type}`, fields },
      previousTransaction,
    },
  };
}

const listing: DocumentListing = {
  id: "listing-1",
  title: "Knowledge",
  description: "Verified section",
  publisher: "0xpublisher",
  category: "research",
  lineCount: 2,
  rootHash: "ab".repeat(32),
  encryptedBlobId: "manifest-blob",
  suiDocumentId: documentObjectId,
  documentTx: "document-tx",
  pricePerLineMist: "1000",
  publicationMode: "publisher-sealed-fragments",
  fragments: [{
    range: { start: 0, end: 0 },
    sealIdentity: "cd".repeat(32),
    encryptedBlobId: "fragment-blob",
    suiFragmentId: fragmentObjectId,
    registrationTx: "fragment-tx",
  }],
  createdAt: "2026-05-27T01:00:00.000Z",
};

const purchase: PurchaseReceipt = {
  id: "receipt-1",
  documentId: listing.id,
  buyer: "0xbuyer",
  range: { start: 0, end: 0 },
  amountMist: "1000",
  paymentTx: "payment-tx",
  suiPurchaseId: purchaseObjectId,
  suiFragmentId: fragmentObjectId,
  createdAt: "2026-05-27T02:00:00.000Z",
};

const capsule: CapsuleRecord = {
  summary: {
    capsuleId: "capsule-1",
    documentId: listing.id,
    rootHash: listing.rootHash,
    lineRange: purchase.range,
    createdAt: "2026-05-27T03:00:00.000Z",
    paymentTx: purchase.paymentTx,
    suiPurchaseId: purchaseObjectId,
    buyer: purchase.buyer,
    publisher: listing.publisher,
    suiDocumentId: documentObjectId,
    suiFragmentId: fragmentObjectId,
  },
  sealedCapsule: {
    version: "1",
    algorithm: "SEAL",
    packageId,
    identity: "identity",
    encryptedObject: "ciphertext",
    suiPurchaseId: purchaseObjectId,
  },
  capsuleBlobId: "capsule-blob",
  suiDisclosureId: disclosureObjectId,
  disclosureTx: "disclosure-tx",
};

function configuredReader(rootHash = listing.rootHash): PublicObjectReader {
  const objects = new Map([
    [documentObjectId, object("Document", {
      root_hash: Array.from(Buffer.from(rootHash, "hex")),
      walrus_blob_id: bytes(listing.encryptedBlobId),
      line_count: "2",
      price_per_line_mist: listing.pricePerLineMist,
      owner: listing.publisher,
    }, "document-tx")],
    [fragmentObjectId, object("Fragment", {
      document_id: documentObjectId,
      seal_identity: Array.from(Buffer.from(listing.fragments![0]!.sealIdentity, "hex")),
      line_start: "0",
      line_end: "0",
      walrus_blob_id: bytes("fragment-blob"),
    }, "fragment-tx")],
    [purchaseObjectId, object("Purchase", {
      document_id: documentObjectId,
      buyer: purchase.buyer,
      line_start: "0",
      line_end: "0",
      amount_mist: purchase.amountMist,
      fragment_id: fragmentObjectId,
      consumed: true,
    }, "disclosure-tx")],
    [disclosureObjectId, object("Disclosure", {
      document_id: documentObjectId,
      purchase_id: purchaseObjectId,
      buyer: purchase.buyer,
      line_start: "0",
      line_end: "0",
      walrus_capsule_blob: bytes(capsule.capsuleBlobId),
    }, "disclosure-tx")],
  ]);
  return {
    async getObject({ id }) {
      return objects.get(id) ?? { error: { code: "notExists" } };
    },
    async getTransactionBlock({ digest }) {
      if (digest === purchase.paymentTx) {
        return { objectChanges: [{ type: "created", objectId: purchaseObjectId }] };
      }
      return { objectChanges: [] };
    },
  };
}

describe("SuiReconciler", () => {
  it("verifies each public chain reference in the marketplace index", async () => {
    const reconciler = new SuiReconciler(packageId, configuredReader());

    const result = await reconciler.reconcile([listing], [purchase], [capsule]);

    expect(result.checked).toBe(4);
    expect(result.verified).toBe(4);
    expect(result.failed).toBe(0);
    expect(result.records.map((record) => record.entityType)).toEqual([
      "document",
      "fragment",
      "purchase",
      "disclosure",
    ]);
  });

  it("flags a document whose local root no longer matches its Sui commitment", async () => {
    const reconciler = new SuiReconciler(packageId, configuredReader("ef".repeat(32)));

    const result = await reconciler.reconcile([listing], [], []);

    expect(result.verified).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.records[0]).toMatchObject({
      entityType: "document",
      status: "mismatch",
      details: "root hash does not match local record",
    });
  });
});
