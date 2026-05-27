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
envelope before this provider receives them. When `SEAL_CAPSULES=true`, paid
disclosure capsules are Seal-encrypted before this provider receives them;
Walrus stores ciphertext plus public provenance summary, rather than purchased
plaintext.

Relevant official documentation:

- [Walrus overview](https://docs.wal.app/design/overview.html)
- [HTTP API storage](https://docs.wal.app/docs/http-api/storing-blobs)
- [Walrus operations](https://docs.wal.app/docs/system-overview/operations)

## Sui Commitments

The Move package in `packages/sui-contracts` defines:

| Entry function | On-chain effect |
| --- | --- |
| `register_document` | Publishes a shared document commitment with root, encrypted blob ID, price, and line count |
| `purchase_range` | Transfers exact-price SUI to the publisher and creates a shared one-use paid receipt |
| `record_disclosure` | Consumes a paid receipt and transfers capsule provenance, including its purchase ID, to the buyer |
| `seal_approve` | Read-only approval for Seal decryption when the caller is the buyer in the identity-matching `Purchase` |

When `PROTOCOL_MODE=testnet` is configured, the disclosure host signs and
submits document and disclosure transactions with `SUI_PRIVATE_KEY`. The
buyer signs `purchase_range` from the connected wallet in the frontend. Before
revealing content, the host resolves the public `Purchase` object and verifies
its document, buyer, range, amount, and creation transaction digest. The
publisher key must remain server-only; it must never be supplied through a
`VITE_` variable.

## Seal Capsule Delivery

Enable `SEAL_CAPSULES=true` in testnet mode. The host encrypts the signed
disclosure capsule with the official Seal SDK using the paid Sui `Purchase`
object ID as its identity. It discards the returned backup symmetric key and
uploads only the Seal envelope to Walrus.

In the browser, the buyer signs a ten-minute Seal session. Seal evaluates a
transaction containing only `capsule::seal_approve(identity, purchase)`;
the Move function succeeds only for the purchase buyer and exact identity.
After Seal decryption, proof and Sui-root verification continue in the browser.

Default public testnet key-server settings are supplied in `.env.example`
from the official Seal documentation. Production configuration should review
key-server selection and verification requirements.

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
testnet path anchors roots, enforces exact-price SUI purchase receipts, records
disclosures on Sui, and can gate stored capsule decryption through Seal. The
disclosure host still temporarily holds publisher source encryption keys and
is the party able to assemble purchased lines.

Production hardening should pre-encrypt fixed purchasable fragments with Seal
at publication time so source decryption is no longer hosted, and add durable
metadata storage.
