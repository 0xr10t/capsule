import type {
  CapsuleRecord,
  ChainReconciliationRecord,
  DocumentListing,
  PurchaseReceipt,
} from "@capsule/shared-types";

export function capsuleIndex(record: CapsuleRecord) {
  return "capsule" in record ? record.capsule : record.summary;
}

export interface MarketplaceRepository {
  readonly repositoryName: "memory" | "postgres";

  init(): Promise<void>;
  listDocuments(): Promise<DocumentListing[]>;
  registerDocument(document: DocumentListing): Promise<void>;
  getDocument(documentId: string): Promise<DocumentListing | undefined>;
  addPurchase(receipt: PurchaseReceipt): Promise<void>;
  getPurchase(purchaseId: string): Promise<PurchaseReceipt | undefined>;
  listPurchases(): Promise<PurchaseReceipt[]>;
  addCapsule(stored: CapsuleRecord): Promise<void>;
  listCapsules(): Promise<CapsuleRecord[]>;
  saveReconciliations(records: ChainReconciliationRecord[]): Promise<void>;
  listReconciliations(): Promise<ChainReconciliationRecord[]>;
  close?(): Promise<void>;
}

export class MemoryMarketplaceRepository implements MarketplaceRepository {
  readonly repositoryName = "memory";
  readonly documents = new Map<string, DocumentListing>();
  readonly purchases = new Map<string, PurchaseReceipt>();
  readonly capsules = new Map<string, CapsuleRecord>();
  readonly reconciliations = new Map<string, ChainReconciliationRecord>();

  async init(): Promise<void> {}

  async listDocuments(): Promise<DocumentListing[]> {
    return [...this.documents.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async registerDocument(document: DocumentListing): Promise<void> {
    this.documents.set(document.id, document);
  }

  async getDocument(documentId: string): Promise<DocumentListing | undefined> {
    return this.documents.get(documentId);
  }

  async addPurchase(receipt: PurchaseReceipt): Promise<void> {
    this.purchases.set(receipt.id, receipt);
  }

  async getPurchase(purchaseId: string): Promise<PurchaseReceipt | undefined> {
    return this.purchases.get(purchaseId);
  }

  async listPurchases(): Promise<PurchaseReceipt[]> {
    return [...this.purchases.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async addCapsule(stored: CapsuleRecord): Promise<void> {
    this.capsules.set(capsuleIndex(stored).capsuleId, stored);
  }

  async listCapsules(): Promise<CapsuleRecord[]> {
    return [...this.capsules.values()].sort((left, right) =>
      capsuleIndex(right).createdAt.localeCompare(capsuleIndex(left).createdAt),
    );
  }

  async saveReconciliations(records: ChainReconciliationRecord[]): Promise<void> {
    for (const record of records) {
      this.reconciliations.set(`${record.entityType}:${record.entityId}`, record);
    }
  }

  async listReconciliations(): Promise<ChainReconciliationRecord[]> {
    return [...this.reconciliations.values()].sort((left, right) =>
      right.checkedAt.localeCompare(left.checkedAt),
    );
  }
}

export class MarketplaceStore extends MemoryMarketplaceRepository {}
