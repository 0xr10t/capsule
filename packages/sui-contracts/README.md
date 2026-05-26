# Capsule Sui Commitments

This Move package stores commitments and provenance pointers, not document
plaintext. `Document` is a shared object so any verifier can resolve its root
and encrypted Walrus blob ID. `Disclosure` objects are created by the
publisher and transferred to each buyer.

## Build and Publish

```bash
sui client switch --env testnet
sui move build
sui client publish --gas-budget 100000000
```

Set the published package ID as `VITE_CAPSULE_PACKAGE_ID`.

## Transactions

`register_document` accepts the 32-byte SHA-256 Merkle root and the encrypted
Walrus blob ID. `record_disclosure` accepts the shared `Document`, buyer,
inclusive line bounds, and the Walrus capsule blob ID.

The Move package enforces that only the document owner records disclosure
provenance. It does not implement payment settlement in the MVP; an accepted
purchase transaction ID remains part of the capsule artifact.

