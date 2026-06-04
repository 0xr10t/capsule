import { performance } from "node:perf_hooks";
import { buildMerkleTree, generateRangeProof, verifyRangeProof } from "../packages/sdk-typescript/src/index.js";

const sizes = (process.env.BENCHMARK_LINE_COUNTS ?? "10000,100000")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isSafeInteger(value) && value > 0);

function lines(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    `company=${index % 17}; section=supplier-risk; signal=${index}; risk_score=${(index * 37) % 1000}`
  );
}

async function timed<T>(label: string, run: () => Promise<T>): Promise<{ label: string; ms: number; value: T }> {
  const start = performance.now();
  const value = await run();
  return { label, ms: performance.now() - start, value };
}

async function main(): Promise<void> {
  for (const count of sizes) {
    const dataset = lines(count);
    const rangeStart = Math.floor(count / 2);
    const rangeEnd = Math.min(count - 1, rangeStart + 9);

    const tree = await timed(`${count} salted leaves: build tree`, () => buildMerkleTree(dataset, { salted: true }));
    if (!tree.value.leafSalts) {
      throw new Error("Salted benchmark did not produce leaf salts");
    }
    const proof = await timed(`${count} salted leaves: generate 10-line proof`, () =>
      generateRangeProof(dataset, rangeStart, rangeEnd, { leafSalts: tree.value.leafSalts })
    );
    const verification = await timed(`${count} salted leaves: verify 10-line proof`, () =>
      verifyRangeProof(dataset.slice(rangeStart, rangeEnd + 1), proof.value, tree.value.rootHash)
    );

    console.log(JSON.stringify({
      lines: count,
      rootHash: tree.value.rootHash,
      paddedLeafCount: tree.value.paddedLeafCount,
      disclosedLines: rangeEnd - rangeStart + 1,
      buildTreeMs: Math.round(tree.ms),
      generateProofMs: Math.round(proof.ms),
      verifyProofMs: Math.round(verification.ms),
      valid: verification.value.valid,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
