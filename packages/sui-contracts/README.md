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

`register_fragment` stores a pointer to one publisher-side Seal-encrypted
fixed section. `purchase_fragment` transfers exact-price SUI for that section
and binds the new `Purchase` directly to its `Fragment` object.

`record_disclosure` accepts a shared `Document`, the matching mutable
`Purchase`, and the Walrus capsule blob ID. The package enforces that only the
document owner records the release, marks the purchase consumed, and stores
the purchase ID in the resulting buyer-owned `Disclosure` object.

`seal_approve` is a read-only Seal policy for encrypted disclosure capsules.
Its Seal identity must be the paid `Purchase` object ID, and only the buyer
recorded by that purchase is approved to decrypt. It remains valid after
`record_disclosure` so an authorized buyer can fetch the permanent Walrus
capsule again.

`record_fragment_disclosure` and `seal_approve_fragment` are the source-keyless
fixed-section path. Both require a fragment-bound paid purchase, so a general
range receipt cannot be replayed to unlock a pre-encrypted section. The
recorded Walrus capsule blob is a ciphertext-only delivery wrapper carrying
purchase provenance around the pre-published fragment ciphertext.
