import { generateKeyPairSync, sign } from "node:crypto";
import type { DisclosureCapsule } from "@capsule/shared-types";
import { describe, expect, it } from "vitest";
import { buildMerkleTree, generateRangeProof, splitLines, verifyCapsule, verifyRangeProof } from "../src/merkle.js";

const lines = ["alpha", "beta", "gamma", "delta", "epsilon"];

describe("Capsule merkle proofs", () => {
  it("deterministically pads documents to a complete tree", async () => {
    const tree = await buildMerkleTree(lines);
    expect(tree.leafCount).toBe(5);
    expect(tree.paddedLeafCount).toBe(8);
    expect(tree.rootHash).toHaveLength(64);
  });

  it("verifies only disclosed lines and rejects tampering", async () => {
    const proof = await generateRangeProof(lines, 1, 3);
    const { rootHash } = await buildMerkleTree(lines);
    expect(await verifyRangeProof(lines.slice(1, 4), proof, rootHash)).toMatchObject({ valid: true });
    expect(await verifyRangeProof(["beta", "modified", "delta"], proof, rootHash)).toMatchObject({
      valid: false,
    });
  });

  it("normalizes publisher line endings", () => {
    expect(splitLines("one\r\ntwo\nthree")).toEqual(["one", "two", "three"]);
  });

  it("validates disclosure host attestation signatures", async () => {
    const proof = await generateRangeProof(lines, 1, 2);
    const { rootHash } = await buildMerkleTree(lines);
    const keys = generateKeyPairSync("ed25519");
    const unsigned = {
      version: "1" as const,
      capsuleId: "capsule-fixture",
      documentId: "document-fixture",
      documentBlobId: "blob-fixture",
      rootHash,
      lineRange: { start: 1, end: 2 },
      disclosedContent: lines.slice(1, 3),
      proof,
      createdAt: "2026-05-26T00:00:00.000Z",
      paymentTx: "0xtx",
      buyer: "0xbuyer",
      publisher: "0xpublisher",
    };
    const capsule: DisclosureCapsule = {
      ...unsigned,
      signature: sign(null, Buffer.from(JSON.stringify(unsigned)), keys.privateKey).toString("base64"),
      signerPublicKey: keys.publicKey.export({ format: "pem", type: "spki" }).toString(),
    };
    expect(await verifyCapsule(capsule)).toMatchObject({ valid: true });
    expect(await verifyCapsule({ ...capsule, signature: Buffer.alloc(64).toString("base64") })).toMatchObject({
      valid: false,
      reason: "Capsule attestation signature is invalid",
    });
  });

  it("verifies publisher-sealed fragments from their committed root without a host signature", async () => {
    const proof = await generateRangeProof(lines, 2, 2);
    const { rootHash } = await buildMerkleTree(lines);
    const sealedFragment: DisclosureCapsule = {
      version: "1",
      capsuleId: "sealed-fragment",
      documentId: "document-fixture",
      documentBlobId: "manifest-fixture",
      rootHash,
      lineRange: { start: 2, end: 2 },
      disclosedContent: ["gamma"],
      proof,
      createdAt: "2026-05-27T00:00:00.000Z",
      paymentTx: "0xtx",
      buyer: "0xbuyer",
      publisher: "0xpublisher",
      disclosureMode: "publisher-sealed-fragment",
    };
    expect(await verifyCapsule(sealedFragment)).toMatchObject({ valid: true });
    expect(await verifyCapsule({ ...sealedFragment, disclosureMode: undefined })).toMatchObject({
      valid: false,
      reason: "Capsule attestation is missing",
    });
  });
});
