import type { DocumentListing, PurchaseReceipt, StoredCapsule } from "@capsule/shared-types";

export class MarketplaceStore {
  readonly documents = new Map<string, DocumentListing>();
  readonly purchases = new Map<string, PurchaseReceipt>();
  readonly capsules = new Map<string, StoredCapsule>();

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

  addCapsule(stored: StoredCapsule): void {
    this.capsules.set(stored.capsule.capsuleId, stored);
  }

  listCapsules(): StoredCapsule[] {
    return [...this.capsules.values()].sort((left, right) =>
      right.capsule.createdAt.localeCompare(left.capsule.createdAt),
    );
  }
}

