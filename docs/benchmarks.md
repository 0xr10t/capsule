# Benchmarks

Capsule's first production-oriented benchmark target is premium research and
due-diligence intelligence: reports large enough to require durable off-chain
storage, but structured enough to sell fixed verifiable sections.

Run local proof benchmarks with:

```bash
npm run build -w @capsule/shared-types
npm run build -w @capsule/sdk-typescript
npm run benchmark:proof
```

Override line counts with:

```bash
BENCHMARK_LINE_COUNTS=10000,100000 npm run benchmark:proof
```

The benchmark emits JSON records containing:

| Field | Meaning |
| --- | --- |
| `lines` | Dataset line count |
| `paddedLeafCount` | Binary-tree leaf count after padding |
| `disclosedLines` | Purchased proof size |
| `buildTreeMs` | Salted Merkle build time |
| `generateProofMs` | Range-proof generation time |
| `verifyProofMs` | Buyer-side proof verification time |
| `valid` | Verification result |

Recommended future measurements:

| Dataset | Measurement |
| --- | --- |
| 10,000 lines | Browser proof-generation time |
| 100,000 lines | Merkle tree memory usage |
| 10 MB document | Walrus upload and retrieval latency |
| 100 MB document | Encryption and publication latency |
| 1,000 fragments | Sui object count and total gas |
| Multiple buyers | Purchase, Seal authorization, and verification latency |

The benchmark is intentionally separated from CI because browser memory,
network latency, and Walrus/Sui fees vary by environment. CI verifies the
algorithmic tests; benchmark runs produce demo evidence.
