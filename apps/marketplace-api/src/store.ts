import type { CapsuleRecord, DocumentListing, PurchaseReceipt } from "@capsule/shared-types";

function capsuleIndex(record: CapsuleRecord) {
  return "capsule" in record ? record.capsule : record.summary;
}

export class MarketplaceStore {
  readonly documents = new Map<string, DocumentListing>();
  readonly purchases = new Map<string, PurchaseReceipt>();
  readonly capsules = new Map<string, CapsuleRecord>();

  listDocuments(): DocumentListing[] {
    return [...this.documents.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  registerDocument(document: DocumentListing): void {
    this.documents.set(document.id, document);
  }

  getDocument(documentId: string): DocumentListing | undefined {
    return this.documents.get(documentId);
  }

  addPurchase(receipt: PurchaseReceipt): void {
    this.purchases.set(receipt.id, receipt);
  }

  getPurchase(purchaseId: string): PurchaseReceipt | undefined {
    return this.purchases.get(purchaseId);
  }

  addCapsule(stored: CapsuleRecord): void {
    this.capsules.set(capsuleIndex(stored).capsuleId, stored);
  }

  listCapsules(): CapsuleRecord[] {
    return [...this.capsules.values()].sort((left, right) =>
      capsuleIndex(right).createdAt.localeCompare(capsuleIndex(left).createdAt),
    );
  }
}
