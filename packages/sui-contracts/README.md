# Capsule Sui Commitments

This Move package stores commitments, paid access authorization, and
provenance pointers, not document plaintext. `Document` is a shared object so
any verifier can resolve its root, encrypted Walrus blob ID, line count, and
per-line price. A paid `Purchase` is shared for public verification and can be
consumed exactly once when the publisher issues a `Disclosure` object to the
buyer.

## Build and Publish

```bash
sui client switch --env testnet
sui move build
sui client publish --gas-budget 100000000
```

Set the published package ID as `VITE_CAPSULE_PACKAGE_ID`.

## Transactions

`register_document` accepts the 32-byte SHA-256 Merkle root, encrypted Walrus
blob ID, line count, and per-line MIST price.

`purchase_range` accepts a shared `Document`, inclusive line bounds, and an
exact `Coin<SUI>` payment. It transfers payment to the publisher and creates a
public `Purchase` object recording the buyer, range, and amount.

`record_disclosure` accepts a shared `Document`, the matching mutable
`Purchase`, and the Walrus capsule blob ID. The package enforces that only the
document owner records the release, marks the purchase consumed, and stores
the purchase ID in the resulting buyer-owned `Disclosure` object.

The public purchase accessors are intentionally suitable for a subsequent Seal
policy module that approves decryption only for the paid buyer and purchased
range.
