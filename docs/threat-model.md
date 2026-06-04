# Capsule Threat Model

Capsule proves provenance and inclusion relative to a publisher commitment. It
does not independently certify that the publisher's content is true, licensed,
current, or valuable.

## Security Goal

For the recommended publisher-sealed fixed-fragment path:

1. the disclosure host never receives the source plaintext or a reusable source
   decryption key;
2. Walrus stores public ciphertext, not public plaintext;
3. a buyer can decrypt only the fragment authorized by a paid Sui `Purchase`;
4. the buyer can verify the disclosed lines against the Sui-anchored document
   commitment.

## Main Trust Boundaries

| Boundary | Assumption |
| --- | --- |
| Publisher browser | Builds Merkle proofs and Seal-encrypts sellable fragments before upload |
| Disclosure host | Coordinates ciphertext storage, purchase validation, and disclosure provenance |
| Walrus | Provides durable public storage; confidentiality must come from encryption |
| Sui | Stores commitments, payments, fragment binding, and disclosure provenance |
| Seal | Releases decryption material only when the Sui policy authorizes the buyer |
| Buyer browser | Decrypts and verifies locally |

## Commitments Are Binding, Not Truth

Merkle verification proves that a disclosed fragment matches a root committed
by the publisher. It does not prove:

- the underlying document is factual;
- the publisher owns or is licensed to sell the material;
- the document existed before the commitment transaction;
- the fragment is useful or complete for the buyer's task.

Product trust should be layered with publisher profiles, external attestations,
licensing terms, sample previews, buyer reputation, and dispute handling.

## Low-Entropy Content

Plain `SHA256(line)` commitments are vulnerable to offline guessing when lines
are short or predictable. Capsule's publisher-sealed flow now uses salted leaf
commitments:

```text
leaf = SHA256("capsule:salted-leaf:v1" || document_nonce || line_index || line_nonce || line_content)
```

Only line nonces for purchased lines are included in the disclosure proof. This
keeps verification local while making unpublished lines substantially harder
to guess from the public root and sibling hashes. Legacy unsalted capsules remain
verifiable for old testnet artifacts, but the trust-minimized product path
uses salted leaves.

## Metadata Leakage

On-chain `Purchase` and `Disclosure` objects reveal buyer address, document
object, fragment or line range, price, timestamp, and consumed status. This can
leak buyer intent even when content remains encrypted.

Capsule should avoid highly sensitive healthcare, legal, or personal-data use
cases until a metadata-privacy strategy exists. Near-term mitigations include
coarser fragment labels, buyer-controlled wallets, organization wallets,
private quote flows, and future confidential purchase mechanisms.

## Revocation And Compliance

Walrus storage provides durable artifacts. Durability helps auditability, but
it complicates deletion, licensing expiry, and dispute handling. A publisher
can stop selling future fragments, but cannot make already decrypted buyer
content unknown again. Future production flows should include license terms,
expiry-aware policies, takedown procedures, and visible revocation semantics.

## Adversarial Cases To Test

- wrong buyer attempts Seal decryption;
- same-range non-fragment purchase attempts fragment unlock;
- underpayment and overpayment;
- consumed purchase replay;
- mismatched document and fragment;
- invalid line ranges and overlapping fragment definitions;
- tampered disclosed content, proof siblings, or leaf salts;
- wrong Sui root;
- missing Walrus blob;
- service restart followed by reconciliation.
