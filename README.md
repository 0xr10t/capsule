# Capsule / DisseK

Capsule is a Walrus-native selective-disclosure protocol for verifiable AI
knowledge exchange, built for the Walrus track of Sui Overflow 2026. A
publisher encrypts a source document before uploading it to Walrus, anchors a
Merkle commitment on Sui, and sells precisely scoped line ranges. Each buyer
receives a permanent disclosure capsule that can be verified without receiving
the original document.

The project is also referred to as **DisseK** in the protocol narrative.
`Capsule` is the repository and demo product name.

## Protocol Promise

- Public Walrus storage never receives plaintext source documents.
- SHA-256 Merkle commitments prove that disclosed lines belong to an anchored
  source document.
- Disclosure capsules include provenance, payment linkage, and replayable proof
  material for humans or AI agents.
- Sui holds document commitments and disclosure provenance; Walrus holds the
  durable encrypted data and capsule artifacts.

## Monorepo

| Path | Purpose |
| --- | --- |
| `apps/frontend` | Publisher, buyer, and verification experience |
| `apps/marketplace-api` | Listing, pricing, purchase, and metadata API |
| `apps/disclosure-host` | Encryption, proof generation, and Walrus capsule host |
| `packages/shared-types` | Protocol contracts shared across services |
| `packages/sdk-typescript` | Browser/node verification and client SDK |
| `packages/proof-engine-rust` | Rust Merkle implementation with WASM exports |
| `packages/sui-contracts` | Move commitments and disclosure events |

## Development Modes

`STORAGE_DRIVER=memory` powers a zero-setup local demo. It exercises the same
encrypted-document and capsule flow without publishing data externally.

`STORAGE_DRIVER=walrus` uploads encrypted documents and disclosure capsules
through a configured Walrus publisher and retrieves them through an aggregator.
Only use test data or encrypted payloads when testing against public storage.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

The web app runs at `http://localhost:5173`, the marketplace API at
`http://localhost:4000`, and the disclosure host at `http://localhost:4001`.

Build and verify all implemented packages:

```bash
npm run check
npm run move:build
npm run wasm:web
```

## Documentation

- [Architecture](docs/architecture.md)
- [Demo script](docs/demo.md)
- [Walrus and Sui integration](docs/integration.md)

