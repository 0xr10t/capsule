import { Pool } from "pg";
import type {
  CapsuleRecord,
  ChainReconciliationRecord,
  DocumentListing,
  PurchaseReceipt,
} from "@capsule/shared-types";
import { capsuleIndex, type MarketplaceRepository } from "./store.js";

export const postgresSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS marketplace_documents (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    record JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_purchases (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    record JSONB NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS marketplace_purchases_document_idx
    ON marketplace_purchases (document_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS marketplace_capsules (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    record JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_chain_reconciliations (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    sui_object_id TEXT NOT NULL,
    status TEXT NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL,
    transaction_digest TEXT,
    details TEXT,
    PRIMARY KEY (entity_type, entity_id)
  )`,
  `CREATE INDEX IF NOT EXISTS marketplace_reconciliations_status_idx
    ON marketplace_chain_reconciliations (status, checked_at DESC)`,
];

function asRecord<T>(record: T | string): T {
  return typeof record === "string" ? JSON.parse(record) as T : record;
}

export class PostgresMarketplaceRepository implements MarketplaceRepository {
  readonly repositoryName = "postgres";
  private readonly pool: Pool;

  constructor(databaseUrl: string, pool?: Pool) {
    this.pool = pool ?? new Pool({ connectionString: databaseUrl });
  }

  async init(): Promise<void> {
    for (const statement of postgresSchemaStatements) {
      await this.pool.query(statement);
    }
  }

  async listDocuments(): Promise<DocumentListing[]> {
    const result = await this.pool.query<{ record: DocumentListing | string }>(
      "SELECT record FROM marketplace_documents ORDER BY created_at DESC",
    );
    return result.rows.map(({ record }) => asRecord(record));
  }

  async registerDocument(document: DocumentListing): Promise<void> {
    await this.pool.query(
      `INSERT INTO marketplace_documents (id, created_at, record)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, record = EXCLUDED.record`,
      [document.id, document.createdAt, JSON.stringify(document)],
    );
  }

  async getDocument(documentId: string): Promise<DocumentListing | undefined> {
    const result = await this.pool.query<{ record: DocumentListing | string }>(
      "SELECT record FROM marketplace_documents WHERE id = $1",
      [documentId],
    );
    const record = result.rows[0]?.record;
    return record === undefined ? undefined : asRecord(record);
  }

  async addPurchase(receipt: PurchaseReceipt): Promise<void> {
    await this.pool.query(
      `INSERT INTO marketplace_purchases (id, document_id, created_at, record)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET document_id = EXCLUDED.document_id,
         created_at = EXCLUDED.created_at, record = EXCLUDED.record`,
      [receipt.id, receipt.documentId, receipt.createdAt, JSON.stringify(receipt)],
    );
  }

  async getPurchase(purchaseId: string): Promise<PurchaseReceipt | undefined> {
    const result = await this.pool.query<{ record: PurchaseReceipt | string }>(
      "SELECT record FROM marketplace_purchases WHERE id = $1",
      [purchaseId],
    );
    const record = result.rows[0]?.record;
    return record === undefined ? undefined : asRecord(record);
  }

  async listPurchases(): Promise<PurchaseReceipt[]> {
    const result = await this.pool.query<{ record: PurchaseReceipt | string }>(
      "SELECT record FROM marketplace_purchases ORDER BY created_at DESC",
    );
    return result.rows.map(({ record }) => asRecord(record));
  }

  async addCapsule(stored: CapsuleRecord): Promise<void> {
    const summary = capsuleIndex(stored);
    await this.pool.query(
      `INSERT INTO marketplace_capsules (id, created_at, record)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, record = EXCLUDED.record`,
      [summary.capsuleId, summary.createdAt, JSON.stringify(stored)],
    );
  }

  async listCapsules(): Promise<CapsuleRecord[]> {
    const result = await this.pool.query<{ record: CapsuleRecord | string }>(
      "SELECT record FROM marketplace_capsules ORDER BY created_at DESC",
    );
    return result.rows.map(({ record }) => asRecord(record));
  }

  async saveReconciliations(records: ChainReconciliationRecord[]): Promise<void> {
    for (const record of records) {
      await this.pool.query(
        `INSERT INTO marketplace_chain_reconciliations (
          entity_type, entity_id, sui_object_id, status, checked_at, transaction_digest, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (entity_type, entity_id) DO UPDATE SET
          sui_object_id = EXCLUDED.sui_object_id,
          status = EXCLUDED.status,
          checked_at = EXCLUDED.checked_at,
          transaction_digest = EXCLUDED.transaction_digest,
          details = EXCLUDED.details`,
        [
          record.entityType,
          record.entityId,
          record.suiObjectId,
          record.status,
          record.checkedAt,
          record.transactionDigest ?? null,
          record.details ?? null,
        ],
      );
    }
  }

  async listReconciliations(): Promise<ChainReconciliationRecord[]> {
    const result = await this.pool.query<{
      entity_type: ChainReconciliationRecord["entityType"];
      entity_id: string;
      sui_object_id: string;
      status: ChainReconciliationRecord["status"];
      checked_at: Date | string;
      transaction_digest: string | null;
      details: string | null;
    }>(
      `SELECT entity_type, entity_id, sui_object_id, status, checked_at,
        transaction_digest, details
       FROM marketplace_chain_reconciliations ORDER BY checked_at DESC`,
    );
    return result.rows.map((record) => ({
      entityType: record.entity_type,
      entityId: record.entity_id,
      suiObjectId: record.sui_object_id,
      status: record.status,
      checkedAt: typeof record.checked_at === "string"
        ? record.checked_at
        : record.checked_at.toISOString(),
      transactionDigest: record.transaction_digest ?? undefined,
      details: record.details ?? undefined,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export async function createMarketplaceRepository(): Promise<MarketplaceRepository> {
  if (process.env.DATABASE_DRIVER !== "postgres") {
    const { MemoryMarketplaceRepository } = await import("./store.js");
    const repository = new MemoryMarketplaceRepository();
    await repository.init();
    return repository;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DATABASE_DRIVER=postgres");
  }
  const repository = new PostgresMarketplaceRepository(process.env.DATABASE_URL);
  await repository.init();
  return repository;
}
