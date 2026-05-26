import { describe, expect, it } from "vitest";
import { buildMerkleTree, generateRangeProof, splitLines, verifyRangeProof } from "../src/merkle.js";

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
});
