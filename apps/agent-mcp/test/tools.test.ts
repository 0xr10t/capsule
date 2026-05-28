import type { CapsuleRecord, DisclosureCapsule, DocumentListing } from "@capsule/shared-types";
import { describe, expect, it, vi } from "vitest";
import {
  fetchCapsule,
  getDocumentCommitment,
  listDocuments,
  verifyCapsuleTool,
  type CapsuleAgentClient,
} from "../src/tools.js";
import { buildMerkleTree, generateRangeProof } from "@capsule/sdk-typescript";

const listing: DocumentListing = {
  id: "document-1",
  title: "Agent-ready fixture",
  description: "A test listing",
  publisher: "0xpublisher",
  category: "research",
  lineCount: 2,
  rootHash: "ab".repeat(32),
  encryptedBlobId: "manifest-blob",
  suiDocumentId: "0xdocument",
  documentTx: "document-tx",
  pricePerLineMist: "1000",
  publicationMode: "publisher-sealed-fragments",
  fragments: [{
    range: { start: 0, end: 0 },
    sealIdentity: "cd".repeat(32),
    encryptedBlobId: "fragment-blob",
    suiFragmentId: "0xfragment",
  }],
  createdAt: "2026-05-28T00:00:00.000Z",
};

async function plaintextCapsule(): Promise<DisclosureCapsule> {
  const lines = ["alpha", "beta"];
  const tree = await buildMerkleTree(lines);
  return {
    version: "1",
    capsuleId: "capsule-1",
    documentId: listing.id,
    documentBlobId: listing.encryptedBlobId,
    rootHash: tree.rootHash,
    lineRange: { start: 1, end: 1 },
    disclosedContent: ["beta"],
    proof: await generateRangeProof(lines, 1, 1),
    createdAt: "2026-05-28T00:01:00.000Z",
    paymentTx: "payment-tx",
    suiPurchaseId: "0xpurchase",
    buyer: "0xbuyer",
    publisher: "0xpublisher",
    suiDocumentId: "0xdocument",
    disclosureMode: "publisher-sealed-fragment",
  };
}

function client(record?: CapsuleRecord): CapsuleAgentClient {
  return {
    listDocuments: vi.fn(async () => [listing]),
    fetchCapsule: vi.fn(async () => {
      if (!record) {
        throw new Error("missing test record");
      }
      return record;
    }),
    verifyDisclosure: vi.fn(async (capsule) => ({
      valid: true,
      anchored: true,
      computedRoot: capsule.rootHash,
      expectedRoot: capsule.rootHash,
      suiDocumentId: capsule.suiDocumentId,
      chainRoot: capsule.rootHash,
    })),
  };
}

describe("agent MCP tool logic", () => {
  it("lists public document summaries without leaking fragment ciphertext", async () => {
    await expect(listDocuments(client(), { category: "Research" })).resolves.toEqual({
      count: 1,
      documents: [expect.objectContaining({
        id: listing.id,
        title: listing.title,
        fragmentCount: 1,
        rootHash: listing.rootHash,
      })],
    });
  });

  it("returns a commitment by marketplace ID or Sui object ID", async () => {
    await expect(getDocumentCommitment(client(), { documentId: "0xdocument" })).resolves.toMatchObject({
      id: listing.id,
      rootHash: listing.rootHash,
      fragments: listing.fragments,
    });
  });

  it("fetches capsule records through the disclosure host client", async () => {
    const capsule = await plaintextCapsule();
    const record: CapsuleRecord = { capsule, capsuleBlobId: "capsule-blob" };

    await expect(fetchCapsule(client(record), { capsuleBlobId: "capsule-blob" })).resolves.toEqual(record);
  });

  it("verifies plaintext publisher-sealed fragments after wallet decryption", async () => {
    const capsule = await plaintextCapsule();

    await expect(verifyCapsuleTool(client(), { capsule })).resolves.toMatchObject({
      mode: "verified-capsule",
      valid: true,
      local: { valid: true },
      host: { valid: true, anchored: true },
    });
  });

  it("reports Seal ciphertext as requiring wallet decryption", async () => {
    const record: CapsuleRecord = {
      summary: {
        capsuleId: "capsule-1",
        documentId: listing.id,
        rootHash: listing.rootHash,
        lineRange: { start: 0, end: 0 },
        createdAt: "2026-05-28T00:01:00.000Z",
        paymentTx: "payment-tx",
        suiPurchaseId: "0xpurchase",
        buyer: "0xbuyer",
        publisher: "0xpublisher",
        suiDocumentId: "0xdocument",
      },
      sealedCapsule: {
        version: "1",
        algorithm: "SEAL",
        packageId: "0xpackage",
        identity: "ef".repeat(32),
        encryptedObject: "ciphertext",
        suiPurchaseId: "0xpurchase",
      },
      capsuleBlobId: "capsule-blob",
    };

    await expect(verifyCapsuleTool(client(record), { capsuleBlobId: "capsule-blob" })).resolves.toMatchObject({
      mode: "sealed-capsule",
      valid: false,
      requiresSealDecryption: true,
      capsuleBlobId: "capsule-blob",
    });
  });
});
