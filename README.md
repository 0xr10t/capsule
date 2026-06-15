# Capsule

> A marketplace for verifiable private knowledge.

Today, if someone sells you a section from a private report or dataset, they
can copy-paste anything, and you have no way to verify whether it came from the
original document.

**Capsule** lets publishers commit a document once, keep the full source
private, and sell only selected sections. Buyers receive the purchased fragment
with a cryptographic proof that verifies it against the original on-chain
commitment.

Instead of trusting the seller, the buyer verifies the content mathematically.

Built for the Walrus track of Sui Overflow 2026, Capsule uses Walrus for
durable encrypted data storage, Sui for commitments and payment provenance,
and Seal for buyer-only decryption. It turns private files into selectively
purchasable knowledge artifacts for humans and AI agents.

## Why Capsule

Private datasets are valuable because they are not public, but useful knowledge
often lives in a small excerpt. Capsule turns private files into verifiable,
selectively purchasable data products:

- **Selective disclosure:** buyers receive only the purchased line range.
- **Verifiable content:** SHA-256 Merkle proofs tie each disclosed line to the
  committed original document.
- **Durable artifacts:** Seal-encrypted sellable fragments and encrypted
  delivery capsules are stored on Walrus.
- **Public provenance:** Sui stores document commitments and disclosure
  records.
- **Agent-ready output:** capsules are stable JSON artifacts suitable for
  verified retrieval and AI workflows.

Capsule can start as a marketplace for premium research, diligence reports,
model-evaluation datasets, licensed training-data fragments, and expert
knowledge packs. The longer-term vision also supports permissioned selective
disclosure for sensitive documents such as medical reports, insurance records,
legal files, or compliance evidence. Those regulated use cases require stronger
identity, consent, licensing, and metadata-privacy controls, so the current
hackathon build demonstrates the trust-minimized data-commerce primitive rather
than claiming production healthcare or legal compliance.

## Capsule Artifact

A decrypted disclosure capsule is an immutable, replayable knowledge fragment
for its authorized buyer:

```json
{
  "documentBlobId": "walrus-encrypted-source-blob",
  "suiDocumentId": "0x...",
  "rootHash": "sha256-merkle-root",
  "lineRange": { "start": 199, "end": 249 },
  "disclosedContent": ["..."],
  "proof": {},
  "paymentTx": "sui-payment-transaction-digest",
  "suiPurchaseId": "0x...",
  "disclosureMode": "publisher-sealed-fragment"
}
```

With publisher-sealed fragments enabled, Walrus stores Seal envelopes rather
than this plaintext JSON. No original document key is created by the host in
this mode.

Salted publisher commitments use:

```text
leaf = SHA256("capsule:salted-leaf:v1" || document_nonce || line_index || line_nonce || line_content)
```

The disclosed capsule includes line nonces only for purchased lines. See
[`docs/threat-model.md`](docs/threat-model.md).

## Why Walrus Is Core

Capsule is not using Walrus as a cosmetic upload bucket. Walrus is the durable
artifact layer that makes the product work:

- **Private files are too large for Sui:** Sui anchors commitments, payments,
  and provenance, while Walrus stores encrypted data at the scale expected of
  file and dataset marketplaces.
- **Blobs are independently retrievable:** buyers, auditors, and AI agents can
  fetch encrypted fragments and capsules without trusting Capsule's API server
  to keep serving them forever.
- **Public storage forces correct encryption:** Walrus blobs are public by
  design, so Capsule uses Seal-encrypted fragments before upload and releases
  decryption only after Sui purchase authorization.
- **Capsules become permanent provenance objects:** every purchased fragment can
  be replayed, inspected, verified, and cited as a durable Walrus artifact.
- **The demo itself can live on Walrus:** the frontend is deployable as a
  Walrus Site, making the application, data, and verification story all part of
  the Walrus/Sui stack.

Removing Walrus would reduce Capsule to a normal API-backed marketplace.
Walrus is what makes the marketplace durable, verifiable, and agent-friendly.

## Architecture

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Interface | React, Vite, Tailwind, TanStack Query, Zustand | Upload, browse, issue capsules, verify |
| Marketplace API | Express, TypeScript, PostgreSQL | Durable listings, prices, receipts, public audit index |
| Disclosure Host | Express, TypeScript | Ciphertext storage, paid-delivery provenance, Sui submission |
| Agent MCP | MCP stdio, TypeScript SDK | AI tools for listing, fetching, and verifying capsules |
| Proof SDK | TypeScript | Browser/node Merkle and capsule verification |
| Proof Engine | Rust, WASM | Canonical Merkle operations and WASM exports |
| Storage | Walrus | Encrypted fragments, manifests, and encrypted delivery capsules |
| Commitments | Sui Move | Document roots, payments, disclosure provenance, Seal policy |
| Access control | Seal | Buyer-only decryption of paid capsule payloads |

## Product Workflow

```mermaid
sequenceDiagram
    actor Publisher
    participant UI as React Frontend
    participant Host as Disclosure Host
    participant Market as Marketplace API
    participant Walrus as Walrus Storage
    participant Sui as Sui Contract
    participant Seal as Seal Key Servers
    actor Buyer as Buyer / AI Agent

    Publisher->>UI: Enter source document and pricing
    UI->>UI: Build Merkle root and section proofs
    UI->>Seal: Encrypt fixed sellable sections locally
    UI->>Host: Upload ciphertext and public metadata only
    Host->>Walrus: Upload ciphertext fragments and manifest
    Walrus-->>Host: Ciphertext blob IDs
    Host->>Sui: register_document(root, manifest)
    Host->>Sui: register_fragment(identity, range, blob)
    Sui-->>Host: Document commitment object
    Host->>Market: Register metadata-only listing

    Buyer->>UI: Browse listing and select fixed section
    UI->>Sui: purchase_fragment(fragment, SUI payment)
    Sui-->>UI: Shared paid Purchase receipt
    UI->>Market: Register purchase receipt metadata
    Market-->>UI: Accepted purchase reference
    UI->>Host: Generate disclosure using receipt
    Host->>Sui: Validate paid Purchase receipt
    Host->>Walrus: Retrieve encrypted fragment only
    Host->>Walrus: Upload encrypted delivery wrapper
    Walrus-->>Host: Capsule blob ID
    Host->>Sui: record_fragment_disclosure(fragment, purchase, delivery)
    Sui-->>Host: Disclosure provenance object
    Host-->>UI: Encrypted capsule and blob ID

    UI->>Seal: Request decryption with wallet session
    Seal->>Sui: Dry-run seal_approve_fragment(fragment, purchase)
    Seal-->>UI: Release decryption material to paid buyer
    UI->>UI: Decrypt capsule locally
    UI->>UI: Verify Merkle proof locally
    UI->>Sui: Read public Document anchor
    UI->>UI: Compare proof root to anchored root
    UI-->>Buyer: Verified against Sui anchor
```

### Publisher Flow

1. A publisher enters a line-oriented dataset and per-line price.
2. In the recommended testnet mode, the browser computes the Merkle root and
   proofs, divides the source into fixed sellable sections, and encrypts each
   section with Seal.
3. The host receives only Seal ciphertext and public range/root metadata.
4. Walrus stores the encrypted fragments and manifest; Sui stores a `Document`
   commitment and one `Fragment` object for each sellable section.

### Buyer Or Agent Flow

1. A connected buyer selects a published section and signs an exact-price SUI
   payment that creates a fragment-bound `Purchase` receipt.
2. The host validates that receipt and records a ciphertext-only delivery
   wrapper without decrypting the section.
3. The purchasing wallet authorizes a short-lived Seal session and decrypts
   the pre-published section locally.
4. The browser independently verifies its Merkle proof and resolves the Sui
   document anchor before accepting the revealed content.


### Monorepo

| Path | Purpose |
| --- | --- |
| `apps/frontend` | Publisher, buyer, and verification experience |
| `apps/marketplace-api` | Listing, pricing, purchase, and metadata API |
| `apps/disclosure-host` | Encryption, proof generation, Walrus, and Sui host |
| `apps/agent-mcp` | MCP server exposing read-only agent tools |
| `packages/shared-types` | Protocol types shared across services |
| `packages/sdk-typescript` | Browser/node verification and client SDK |
| `packages/proof-engine-rust` | Rust Merkle implementation with WASM exports |
| `packages/sui-contracts` | Move document and disclosure objects |

## Live Testnet Validation

The current build has completed a real synthetic end-to-end run against Walrus
testnet and Sui testnet:

| Item | Public identifier |
| --- | --- |
| Sui Move package with fixed-fragment policy | `0xd7fbb00bee87bbc0f9f4a196dac5f6607cc22f11157e6ed9e24dfd9cd02f4112` |
| Package publish transaction | `Byn8XZrEqQdoP67voZhQkhw1ATb34HRBKek7sLCE1P9Z` |
| Anchored Document object | `0x2a8769dd14306288c9debcd587b07923d1c4d1fa96ea368b427f7860b0274262` |
| Encrypted Fragment object | `0x678194bd04275dd5b6c35a7956c37364bee83adc336f67c2629e7d8c4c380a4f` |
| Paid fragment Purchase object | `0x125376c66e5afed0b3e42e3fb2b4992059a5336d28a26020e6dea04be62e194a` |
| Payment transaction | `AsVFwTBv4oNJVxeF9hziNZu1N8nRokfokaD39wQsBQxD` |
| Recorded Disclosure object | `0xa8d4dc5441f7edafb0b561d311c0b6c910480b7bcb5ada1c43c1620de7220f08` |
| Encrypted fragment Walrus blob | `YjFJYV37rpX9XE9qm9UI_rcCJ7xiNC6K39Qb8dPYYu4` |
| Encrypted delivery Walrus blob | `QFkdFayU0fhlnkFKYLk-oXNDSbtGUyJBtZj6pD4liuI` |

On May 27, 2026, the publisher-side flow sent no plaintext `content` field to
the disclosure host: the browser-produced Seal ciphertext was stored on
Walrus, registered as a Sui `Fragment`, and sold through a real `1,000,000`
MIST fragment-bound purchase. The buyer decrypted one selected line through
Seal and verified it against the Sui root. A separate same-range legacy
purchase was rejected by the fragment policy. Full public artifacts are recorded in
[`docs/testnet-validation.md`](docs/testnet-validation.md) and
[`deployments/sui-testnet.json`](deployments/sui-testnet.json).

The hosted marketplace is seeded with realistic AI-data marketplace examples:

| Listing | Use case |
| --- | --- |
| `Supplier Risk Report — Battery Supply Chain` | EV procurement and supplier-risk intelligence |
| `Private Crypto Protocol Diligence Report` | Protocol, treasury, and validator-risk research |
| `AI Model Evaluation Dataset Notes` | Verified model-evaluation evidence for agents |
| `Market Intelligence: India EV Components` | Market-entry and sourcing intelligence |
| `Legal Case Research Memo — Public demo synthetic` | Permissioned selective-disclosure demo without real client data |

Each listing is published as fixed Seal-encrypted fragments with salted Merkle
proofs, Walrus blob references, and Sui document/fragment commitments.

## Security Model And MVP Boundary

Walrus is public storage. In the recommended fixed-fragment mode, the
publisher browser encrypts sellable sections through Seal before upload.
`seal_approve_fragment` permits decryption only for a purchase bound to that
exact fragment and buyer. An AES host-generated compatibility mode remains for
local/demo and legacy arbitrary-range flows.

The live testnet implementation currently proves:

- browser-encrypted fixed fragment publication on Walrus without source plaintext reaching the host;
- permanent capsule publication on Walrus;
- Sui document-root anchoring and disclosure provenance;
- fragment-bound paid-buyer Seal decryption authorization;
- local proof and on-chain-root verification;
- rejection of a non-fragment receipt even when it pays for the same bounds.

Testnet purchases now transfer exact-price SUI payments to the publisher and
create a one-use shared receipt that must be consumed to record disclosure.
The source-key custody boundary is removed for the fixed-fragment mode. The
marketplace can persist metadata in PostgreSQL and reconcile its recorded
documents, fragments, purchases, and disclosures against public Sui state.
Remaining production gaps include stronger publisher authentication/ownership
UX and operational hardening for hosted deployment. See
[`docs/roadmap.md`](docs/roadmap.md), [`docs/threat-model.md`](docs/threat-model.md),
and [`docs/benchmarks.md`](docs/benchmarks.md).

## Run Locally

Requirements: Node.js 20+, npm, Rust tooling for proof-engine tests, the Sui
CLI for Move builds, and `wasm-pack` for WASM builds.

```bash
cp .env.example .env
npm install
npm run dev
```

Services:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Marketplace API | `http://localhost:4000` |
| Disclosure Host | `http://localhost:4001` |

In local demo mode, use `STORAGE_DRIVER=memory`. It exercises encryption,
proofs, capsules, and UI verification without publishing external artifacts.

## Agent MCP

After the marketplace and disclosure host are running, expose Capsule to an AI
client with:

```bash
npm run build -w @capsule/agent-mcp
npm run mcp:agent
```

The MCP server provides `list_documents`, `get_document_commitment`,
`fetch_capsule`, and `verify_capsule`. It is intentionally read-only: agents
can inspect commitments and verify decrypted capsules, but wallet purchases
and Seal authorization still require an explicit buyer flow.

## Walrus Site

Capsule can prepare and deploy the Vite frontend as a Walrus Site. The deploy
wrapper builds `apps/frontend`, writes `ws-resources.json` into the static
bundle with cache headers, and then calls `site-builder deploy`.

```bash
suiup install site-builder@mainnet
suiup install walrus@testnet
npm run walrus-site:prepare
npm run deploy:walrus-site
```

Configure the public build before a real publish:

```env
VITE_MARKETPLACE_API_URL=https://your-marketplace-api.example
VITE_DISCLOSURE_HOST_URL=https://your-disclosure-host.example
WALRUS_SITE_CONTEXT=testnet
WALRUS_SITE_EPOCHS=1
```

The deploy script refuses to publish with `localhost` API URLs unless
`WALRUS_SITE_ALLOW_LOCAL_APIS=true` or `--allow-local-apis` is provided. That
keeps the public Walrus Site from shipping a frontend that only works on the
developer laptop.

Current testnet Walrus Site:

```text
Site object ID: 0x1fde79935fe41288be57595e6f674625527af56ca66af6436694aed27d93b000
Testnet portal host: slexkmjwaz0gxjqmmj602ss891d8ny80ivihyk5xj709cudj4
```

`wal.app` serves mainnet sites only. For testnet demos, use a self-hosted or
third-party Walrus Sites portal with the host above.

### Durable Marketplace Metadata

The zero-setup demo keeps `DATABASE_DRIVER=memory`. For a persistent
marketplace, run PostgreSQL, create the database named in `DATABASE_URL`, and
set:

```env
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://capsule:capsule@localhost:5432/capsule
RECONCILIATION_INTERVAL_MS=60000
```

The marketplace creates tables for listings, receipts, capsules, and public
chain reconciliation results on startup. It stores public metadata only; it
never stores plaintext sections or Seal decryption keys. With `SUI_PACKAGE_ID`
configured, `POST /internal/reconcile` immediately checks indexed references
against Sui and `GET /reconciliations` returns the most recent audit statuses.

## Run Against Testnet

Never paste a private key into source code, screenshots, chat, or a commit.
Put a funded Sui testnet `suiprivkey...` value only in the gitignored `.env`
file:

```env
PROTOCOL_MODE=testnet
STORAGE_DRIVER=walrus
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=suiprivkey...
SUI_PACKAGE_ID=0xd7fbb00bee87bbc0f9f4a196dac5f6607cc22f11157e6ed9e24dfd9cd02f4112
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://capsule:capsule@localhost:5432/capsule
RECONCILIATION_INTERVAL_MS=60000
SEAL_CAPSULES=true
VITE_SUI_NETWORK=testnet
VITE_CAPSULE_PACKAGE_ID=0xd7fbb00bee87bbc0f9f4a196dac5f6607cc22f11157e6ed9e24dfd9cd02f4112
VITE_PUBLISHER_SEALED_FRAGMENTS=true
```

To publish a new contract package instead of using the recorded deployment:

```bash
npm run deploy:testnet
```

Then use the printed public package ID for both `SUI_PACKAGE_ID` and
`VITE_CAPSULE_PACKAGE_ID`.

## Build And Verify

```bash
npm run check
npm run move:build
npm run wasm:node
npm run wasm:web
```

## Documentation

- [Architecture](docs/architecture.md)
- [Demo script](docs/demo.md)
- [Walrus and Sui integration](docs/integration.md)
- [Testnet validation record](docs/testnet-validation.md)
- [Upgrade roadmap](docs/roadmap.md)
