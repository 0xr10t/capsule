# Walrus and Sui Integration

## Walrus Storage

Capsule's `WalrusProvider` follows the publisher/aggregator HTTP flow:

- `PUT {WALRUS_PUBLISHER_URL}/v1/blobs?epochs={WALRUS_EPOCHS}&permanent=true` writes a blob.
- `GET {WALRUS_AGGREGATOR_URL}/v1/blobs/{blobId}` reads a blob.
- Both newly created and already-certified publisher responses are handled.

The implementation adds `permanent=true` to every upload and, in testnet
protocol mode, adds `send_object_to={Sui signer address}` so the application
publisher receives the public Walrus blob object. Set `STORAGE_DRIVER=walrus`
to leave local demo storage. Source documents are wrapped in an AES-256-GCM
envelope before this provider receives them.
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

When `PROTOCOL_MODE=testnet` is configured, the disclosure host signs and
submits both Move transactions with `SUI_PRIVATE_KEY`, and stores the created
Sui object IDs and transaction digests in public marketplace metadata. The key
must remain server-only; it must never be supplied through a `VITE_` variable.

The viewer validates the disclosed-line Merkle paths and host attestation
locally. For capsules that contain a Sui `Document` object ID, it additionally
reads the public Sui object from the configured network and reports success
only if its on-chain root equals the proof root.

## Deploying The Move Package

Keep `SUI_PRIVATE_KEY` only in the local gitignored `.env` file, formatted as a
Sui `suiprivkey...` value funded on testnet. Then execute:

```bash
npm run deploy:testnet
```

The deployment script publishes `packages/sui-contracts`, transfers the
upgrade capability to that signing address, and prints the transaction digest
and public package ID. Add that public ID to `SUI_PACKAGE_ID` and
`VITE_CAPSULE_PACKAGE_ID`.

## MVP Trust Statement

Capsule proves content inclusion without revealing the full document. The
testnet path now anchors roots and disclosures on Sui, but the disclosure host
temporarily holds publisher encryption keys and is the only party able to
release purchased lines. Payment authorization is still not decentralized.

Production hardening should add an authenticated purchaser session, durable
encrypted key custody or threshold release, and Move-enforced payment before
provenance is emitted.
