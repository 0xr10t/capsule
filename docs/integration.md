# Walrus and Sui Integration

## Walrus Storage

Capsule's `WalrusProvider` follows the publisher/aggregator HTTP flow:

- `PUT {WALRUS_PUBLISHER_URL}/v1/blobs?epochs={WALRUS_EPOCHS}&permanent=true` writes a blob.
- `GET {WALRUS_AGGREGATOR_URL}/v1/blobs/{blobId}` reads a blob.
- Both newly created and already-certified publisher responses are handled.

The implementation adds `permanent=true` to every upload and, in testnet
protocol mode, adds `send_object_to={Sui signer address}` so the application
publisher receives the public Walrus blob object. Set `STORAGE_DRIVER=walrus`
to leave local demo storage. In the recommended publisher-sealed mode,
the provider receives only encrypted fixed fragments, a public manifest, and
ciphertext-only delivery wrappers. The legacy host-generated mode continues
to store an AES-256-GCM source envelope.

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
| `register_fragment` | Commits a fixed Seal-encrypted section's range, identity, and Walrus blob |
| `purchase_fragment` | Pays for exactly one registered fragment and binds its ID into the receipt |
| `record_fragment_disclosure` | Records an encrypted delivery wrapper for a fragment-bound paid purchase |
| `seal_approve_fragment` | Approves decryption only for the buyer with the matching fragment-bound receipt |

When `PROTOCOL_MODE=testnet` is configured, the disclosure host signs and
submits document and disclosure transactions with `SUI_PRIVATE_KEY`. The
buyer signs `purchase_range` from the connected wallet in the frontend. Before
revealing content, the host resolves the public `Purchase` object and verifies
its document, buyer, range, amount, and creation transaction digest. The
publisher key must remain server-only; it must never be supplied through a
`VITE_` variable.

## Seal Fixed-Fragment Publication

Enable `VITE_PUBLISHER_SEALED_FRAGMENTS=true` in testnet mode. The browser
builds the full-document root and per-section proofs, encrypts each fixed
sellable section with the official Seal SDK, and transmits only those
ciphertexts to the host. The host uploads ciphertext to Walrus and registers
its range and identity as a Sui `Fragment`.

In the browser, the buyer signs a ten-minute Seal session. Seal evaluates a
transaction containing `capsule::seal_approve_fragment(identity, document,
fragment, purchase)`; it succeeds only for the purchase buyer and exact
fragment-bound receipt.
After Seal decryption, proof and Sui-root verification continue in the browser.

Default public testnet key-server settings are supplied in `.env.example`
from the official Seal documentation. Production configuration should review
key-server selection and verification requirements.

The viewer validates the disclosed-line Merkle paths and host attestation
locally. For capsules that contain a Sui `Document` object ID, it additionally
reads the public Sui object from the configured network and reports success
only if its on-chain root equals the proof root.

## Marketplace Persistence And Reconciliation

Set `DATABASE_DRIVER=postgres` and `DATABASE_URL` to keep public listings,
payment receipt references, capsule summaries, and reconciliation statuses
across API restarts. The marketplace creates its PostgreSQL tables on startup.
The payload columns are JSONB records of public protocol metadata; source
plaintext and decryption material never enter this database.

When `SUI_PACKAGE_ID` is configured, the marketplace can index its Sui
references without a signer:

| Endpoint | Purpose |
| --- | --- |
| `POST /internal/reconcile` | Read every indexed Sui object now and persist verification statuses |
| `GET /reconciliations` | Return the latest persisted status for each referenced object |

Set `RECONCILIATION_INTERVAL_MS` to a positive millisecond interval to run the
same public-read audit periodically. It checks `Document` ownership,
`Fragment` references, fragment-bound `Purchase` records, and `Disclosure`
records. For a consumed `Purchase`, it reads the
recorded payment transaction's object changes to prove the receipt originated
from that payment rather than treating its later disclosure mutation as its
creation transaction.

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
testnet fixed-fragment path anchors roots, enforces exact-price SUI purchases,
records disclosures on Sui, and gates stored fragment decryption through Seal
without giving source plaintext or a source encryption key to the host.

Durable PostgreSQL metadata storage and public Sui reconciliation are now
available for deployed environments. Production hardening should still add
wallet-owned publisher registration and operational authentication around
internal service routes. Arbitrary range release should remain disabled in the
trust-minimized path unless implemented through an appropriate
encrypted-fragment strategy.
