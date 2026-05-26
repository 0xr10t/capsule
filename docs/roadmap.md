# Protocol Upgrade Roadmap

## Current Milestone: Paid Verifiable Disclosure

Capsule now covers the public audit path required for a credible testnet demo:

- permanent encrypted source and capsule storage on Walrus;
- document root and capsule provenance objects on Sui;
- exact-price SUI payments from the buyer wallet;
- a one-use shared `Purchase` object required by `record_disclosure`;
- local proof and on-chain root verification.

The remaining central trust assumption is that the disclosure host currently
holds the AES key used to decrypt an original source before producing the
purchased fragment.

## Seal: Preserve Selective Disclosure First

Seal is the highest-value next integration, but the policy must not decrypt the
complete source document for any buyer. If a buyer who paid for lines 20-25
receives Seal access to the full encrypted source, Capsule has ceased to be a
selective-disclosure protocol.

The compatible target design is fragment-level encryption:

1. At publication, the publisher selects purchasable sections and builds the
   root over the original line ordering.
2. The publisher encrypts each sellable fragment with Seal using an identity
   that binds document ID and range, then stores encrypted fragments on Walrus.
3. `purchase_range` creates the paid Sui authorization for one fragment.
4. A Capsule `seal_approve` policy authorizes decryption only when the
   requesting wallet is the buyer in a matching paid `Purchase` object.
5. The buyer decrypts only that fragment through Seal and locally verifies its
   Merkle proof against the Sui document commitment.

This removes document-key custody from the disclosure host while preserving the
core promise. Arbitrary ad hoc line ranges require either per-line encrypted
fragments, publisher-online capsule generation, or a trusted computation
environment; fixed purchasable sections are the practical hackathon version.

Official reference: [Seal documentation](https://seal-docs.wal.app/).

## Recommended Sequence

| Priority | Upgrade | Reason |
| --- | --- | --- |
| Complete | Sui paid purchase receipts and wallet signing | Makes each paid disclosure observable and enforceable on-chain |
| Next | Seal-encrypted purchasable fragments plus `seal_approve` | Removes the in-process source key without exposing full documents |
| Next | PostgreSQL persistence and indexed chain reconciliation | Prevents listings and operational state from disappearing on restart |
| Then | MCP server around listing, fetch, and verify tools | Provides a concrete AI-agent demonstration after payment/decryption contracts stabilize |
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
configuration are stable. It is high-signal distribution, but it does not
replace the higher-priority Seal change: publishing the UI on Walrus does not
remove the disclosure host's access to plaintext.

On testnet, visitors need a self-hosted or third-party portal; the
Mysten-operated `wal.app` portal serves mainnet sites with a SuiNS name.

Official reference: [Walrus Sites documentation](https://docs.wal.app/docs/sites/getting-started/publishing-your-first-site).
