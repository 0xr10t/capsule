# Protocol Upgrade Roadmap

## Current Milestone: Durable Public Metadata And Chain Reconciliation

Capsule now covers the public audit path required for a credible testnet demo:

- permanent encrypted fragment, manifest, and delivery storage on Walrus;
- document root and capsule provenance objects on Sui;
- exact-price SUI payments from the buyer wallet;
- a one-use shared `Purchase` object required by `record_disclosure`;
- Seal-encrypted paid capsules stored on Walrus and decrypted by the paid
  buyer through the `seal_approve` Sui policy;
- publisher-side Seal-encrypted fixed fragments, purchased through
  fragment-bound receipts and decrypted through `seal_approve_fragment`;
- optional PostgreSQL storage for durable public marketplace records;
- read-only indexed reconciliation of recorded Sui documents, fragments,
  purchases, and disclosures;
- local proof and on-chain root verification.

The disclosure host no longer receives source plaintext or a document key in
the fixed-fragment mode. The older arbitrary-range AES route remains as a
compatibility/demo mode and should not be used as the trust-minimized product
path.

## Seal Status: Fixed-Fragment Path Implemented

The implemented Seal path protects the purchased capsule after it has been
generated: the capsule is encrypted under its paid `Purchase` object ID,
stored on Walrus as ciphertext, and decrypted locally only by the recorded
buyer. This fixes public exposure of issued paid capsules.

The source-keyless fragment design is now implemented:

1. At publication, the publisher selects purchasable sections and builds the
   root over the original line ordering.
2. The publisher encrypts each sellable fragment with Seal using an identity
   that binds document ID and range, then stores encrypted fragments on Walrus.
3. `purchase_fragment` creates a paid Sui authorization bound to exactly one
   registered `Fragment`.
4. `seal_approve_fragment` authorizes decryption only when the requesting
   wallet owns a matching fragment-bound paid `Purchase` object.
5. The buyer decrypts only that fragment through Seal and locally verifies its
   Merkle proof against the Sui document commitment.

This removes document-key custody from the disclosure host while preserving
the core promise for fixed purchasable sections. Arbitrary ad hoc line ranges
still require per-line encrypted fragments, publisher-online generation, or a
trusted computation environment.

Official reference: [Seal documentation](https://seal-docs.wal.app/).

## Recommended Sequence

| Priority | Upgrade | Reason |
| --- | --- | --- |
| Complete | Sui paid purchase receipts and wallet signing | Makes each paid disclosure observable and enforceable on-chain |
| Complete | Seal-encrypted paid capsules plus `seal_approve` | Prevents public disclosure payload exposure and proves paid-buyer gating |
| Complete | Publisher-side Seal-encrypted purchasable fragments | Removes the in-process source key without exposing full documents |
| Complete | PostgreSQL persistence and indexed chain reconciliation | Prevents listings and public audit state from disappearing on restart |
| Next | MCP server around listing, fetch, and verify tools | Provides a concrete AI-agent demonstration after payment/decryption contracts stabilize |
| Then | Walrus Site frontend deployment | Makes the public demo itself verifiable through the Walrus stack |
| Optional | zkLogin onboarding | Improves consumer UX; does not fix protocol trust boundaries |

## MCP Agent Surface

The TypeScript SDK already exposes the basis for a small MCP server. A credible
agent-facing package should first expose read-only and verifiable operations:

- `list_documents`;
- `get_document_commitment`;
- `fetch_capsule`;
- `verify_capsule`.

Paid purchase tooling must use a delegated Sui signer or an explicit
human-approval step. It should never hide a wallet transaction inside an
apparently read-only agent action.

## Walrus Site Deployment

A Walrus Site is worthwhile once the payment-enabled frontend and environment
configuration are stable. It is high-signal distribution, but durable metadata
and chain reconciliation remain more important for a reliable marketplace.

On testnet, visitors need a self-hosted or third-party portal; the
Mysten-operated `wal.app` portal serves mainnet sites with a SuiNS name.

Official reference: [Walrus Sites documentation](https://docs.wal.app/docs/sites/getting-started/publishing-your-first-site).
