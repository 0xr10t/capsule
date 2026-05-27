import type { DocumentListing } from "@capsule/shared-types";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { PostgresMarketplaceRepository, postgresSchemaStatements } from "../src/postgres.js";

const listing: DocumentListing = {
  id: "document-1",
  title: "Durable knowledge",
  description: "Persisted metadata only",
  publisher: "0xpublisher",
  category: "research",
  lineCount: 1,
  rootHash: "ab".repeat(32),
  encryptedBlobId: "walrus-manifest",
  pricePerLineMist: "1000",
  createdAt: "2026-05-27T01:00:00.000Z",
};

describe("PostgresMarketplaceRepository", () => {
  it("creates its public-metadata schema and upserts JSONB document records", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const end = vi.fn().mockResolvedValue(undefined);
    const pool = { query, end } as unknown as Pool;
    const repository = new PostgresMarketplaceRepository("postgresql://unused", pool);

    await repository.init();
    expect(query).toHaveBeenCalledTimes(postgresSchemaStatements.length);
    expect(query.mock.calls.map((call) => call[0])).toEqual(postgresSchemaStatements);

    await repository.registerDocument(listing);
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO marketplace_documents"),
      [listing.id, listing.createdAt, JSON.stringify(listing)],
    );

    query.mockResolvedValueOnce({ rows: [{ record: listing }] });
    await expect(repository.listDocuments()).resolves.toEqual([listing]);

    await repository.close();
    expect(end).toHaveBeenCalledOnce();
  });
});
