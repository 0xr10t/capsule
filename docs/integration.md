# Walrus and Sui Integration

## Walrus Storage

Capsule's `WalrusProvider` follows the publisher/aggregator HTTP flow:

- `PUT {WALRUS_PUBLISHER_URL}/v1/blobs?epochs={WALRUS_EPOCHS}` writes a blob.
- `GET {WALRUS_AGGREGATOR_URL}/v1/blobs/{blobId}` reads a blob.
- Both newly created and already-certified publisher responses are handled.

Set `STORAGE_DRIVER=walrus` to leave local demo storage. Source documents are
wrapped in an AES-256-GCM envelope before this provider receives them.
Disclosure capsules intentionally contain purchased plaintext and are public,
because their purpose is durable replayable disclosure.

Relevant official documentation:

- [Walrus overview](https://docs.wal.app/design/overview.html)
- [HTTP API storage](https://docs.wal.app/docs/http-api/storing-blobs)
- [Walrus operations](https://docs.wal.app/docs/system-overview/operations)

## Sui Commitments

The Move package in `packages/sui-contracts` defines:

| Entry function | On-chain effect |
| --- | --- |
| `register_document` | Publishes a shared document commitment with root and encrypted blob ID |
| `record_disclosure` | Transfers a capsule provenance object to the buyer |

The current local demo displays a Sui wallet connection and generates the exact
root/blob inputs for these calls. Transaction submission and object-ID
reconciliation are the next testnet wiring step; no demo screen falsely claims
that memory-backed blobs were anchored on chain.

The local viewer validates both the disclosed-line Merkle paths and the
disclosure host's Ed25519 attestation. It reports an inclusion proof rather
than claiming on-chain authenticity until it can resolve the capsule root
against a published `Document` object on Sui.

## MVP Trust Statement

Capsule proves content inclusion without revealing the full document. In this
MVP, the disclosure host temporarily holds publisher encryption keys and is the
only party able to release purchased lines. Merkle verification is trustless;
key custody and payment authorization are not yet decentralized.

Production hardening should add an authenticated purchaser session, durable
encrypted key custody or threshold release, and Move-enforced payment before
provenance is emitted.
