import type { ChainReconciliationRecord, DocumentListing, PurchaseReceipt } from "@capsule/shared-types";
import { describe, expect, it } from "vitest";
import { MemoryMarketplaceRepository } from "../src/store.js";

const document: DocumentListing = {
  id: "document-1",
  title: "Knowledge",
  description: "Verifiable lines",
  publisher: "0xpublisher",
  category: "research",
  lineCount: 2,
  rootHash: "aa".repeat(32),
  encryptedBlobId: "manifest-blob",
  pricePerLineMist: "1000",
  createdAt: "2026-05-27T01:00:00.000Z",
};

describe("MemoryMarketplaceRepository", () => {
  it("stores indexed metadata records and chain reconciliation results", async () => {
    const repository = new MemoryMarketplaceRepository();
    const receipt: PurchaseReceipt = {
      id: "purchase-1",
      documentId: document.id,
      buyer: "0xbuyer",
      range: { start: 0, end: 0 },
      amountMist: "1000",
      paymentTx: "payment-tx",
      createdAt: "2026-05-27T02:00:00.000Z",
    };
    const reconciliation: ChainReconciliationRecord = {
      entityType: "purchase",
      entityId: receipt.id,
      suiObjectId: "0xpurchase",
      status: "verified",
      checkedAt: "2026-05-27T03:00:00.000Z",
    };

    await repository.init();
    await repository.registerDocument(document);
    await repository.addPurchase(receipt);
    await repository.saveReconciliations([reconciliation]);

    await expect(repository.listDocuments()).resolves.toEqual([document]);
    await expect(repository.getPurchase(receipt.id)).resolves.toEqual(receipt);
    await expect(repository.listPurchases()).resolves.toEqual([receipt]);
    await expect(repository.listReconciliations()).resolves.toEqual([reconciliation]);
  });
});
