# Testnet Validation Record

## Walrus Permanent Storage

Validated on May 26, 2026 using intentionally synthetic, non-confidential
content and `permanent=true` uploads through the configured Walrus testnet HTTP
publisher.

| Artifact | Walrus blob ID |
| --- | --- |
| AES-256-GCM encrypted source envelope | `NdpkIDgtBIqScRVmTBlHGte1s9-8q4KgZ8BTzeoZ0vo` |
| Single-line disclosure capsule | `bu4rE3ZHwuhgtc2Y6NMyFgayb1lwNz-T-b8t0BNQUxI` |

The capsule was fetched back through the aggregator and verified by Capsule.
Only the purchased synthetic content was disclosed:

```text
selectively disclosed synthetic line 2
```

## Sui-Anchored End-To-End Flow

Validated on May 26, 2026 with a synthetic three-line source. The disclosure
host encrypted the source, wrote the encrypted envelope and public disclosure
capsule as permanent Walrus testnet blobs, and signed the corresponding Sui
testnet transactions.

| Artifact | Public identifier |
| --- | --- |
| Capsule Move package | `0x4567219aa7d9e4704b6f73b8808b8a4442d61d1985d5d66b5591082626b978a7` |
| Package publish transaction | `EsFCSjENtdR91iQ8E7DnJpERPUTAenmVPAzHyQC32hm8` |
| Publisher address | `0x36d11715f9de629020e20901ce473a8d44d23609c948999175a1673d183eaf21` |
| AES-256-GCM encrypted source blob | `rCqpFjZYtwFv8BRsUFEKyEJAuK4I4xr503Qq_rJpREY` |
| Encrypted source Walrus object | `0x76d8728dcd4c685c8c42a0890702d9cfa69bba7a3bab33666b29dfee66e7742c` |
| Sui Document object | `0xd128df2fe8e079ec426d03b4450236603d1774be5345b70ff8203c6b76408766` |
| Document registration transaction | `H2F49Xr85pdNXUgJ6FXPsZUhaA8tQTw77ddW1xrcUA4w` |
| Disclosure capsule blob | `BcM_Rv_crbWO8jZGjSORC74MxhffppH0MnBSticlcK4` |
| Capsule Walrus object | `0xdbb60b6c5ea91c022b20662f899a2738f86943272cf895d09466f2f6ed7aa070` |
| Sui Disclosure object | `0xa7a46ad1c07e55c645cfe555a8017669a181c8c7a5b217ab237b5aceffa691f4` |
| Disclosure record transaction | `Chj1rUki8NENBs8Ps2zE7JwL7d1yCpCjcH7LKMkM7ENk` |

Only the purchased synthetic line appeared in the capsule:

```text
anchored disclosed synthetic line 2
```

API verification returned `valid: true`, `anchored: true`, with an on-chain
root matching the capsule root. The frontend then fetched the Sui Document
anchor independently and displayed **Verified against Sui anchor**.

The purchase reference for this validation is `demo-no-payment-settlement`.
It documents that payment settlement is outside the current MVP; storage and
provenance anchoring are real testnet operations.

## Paid Disclosure Settlement Upgrade

Validated on May 26, 2026 after publishing the payment-enabled Move package.
This run used a synthetic line range and a real `1,000,000` MIST Sui testnet
payment. The resulting shared `Purchase` object was validated by the
disclosure host and consumed exactly once when the disclosure provenance was
recorded.

| Artifact | Public identifier |
| --- | --- |
| Payment-enabled Capsule package | `0xafd35495751db2d8e19d9af79570554632b29d9beb578d6e891b46a6bcf8b85d` |
| Package publish transaction | `EMoSoor8gAS5he8onViEpghY1o1UWdgyJCKofB5Ax6HE` |
| Encrypted source Walrus blob | `ozEO9qULtiMPcvuYA_T2DfhwOCkhXJYeDx-7lLkkGYY` |
| Sui Document object | `0xc3abd0d523f680c7e5a560547a6c8848267e5ecd2b0eb73aa49b2a0a77c8d985` |
| Document registration transaction | `DAiJGQWTMEJvLUryp75NrDr969hJ2MAmqsoa3fsbk9V` |
| Paid Purchase object | `0x0f6b54ba10ab22c8a528af95d2bf01f6e3ef43fc9e9b156a3fbb41b648762104` |
| Payment transaction | `9zcvVqCCmAzYeLRbhEVFVshSkVgohiddoBo1BmkjHrnm` |
| Payment amount | `1000000` MIST |
| Disclosure capsule Walrus blob | `CB4NLxNfjeLOVGkHoVSAhKQzBipYsH12zV4SzwOOZaU` |
| Sui Disclosure object | `0xbd76091e8140bfd77e863ba060d3750a462d279c71c198b7a57a2339a0f2cd4f` |
| Disclosure record transaction | `3oG9vED7GPN8TJ6xcTjD8EvMfwd1mEVY5PxbXYxxrVub` |

Only the purchased line was disclosed:

```text
paid disclosed synthetic line 2
```

Verification returned `valid: true` and `anchored: true`. Reading the public
Purchase object after disclosure confirmed `consumed: true`. The frontend
displayed the paid Purchase object and reported **Verified against Sui
anchor** for the issued capsule.

## Disclosure-To-Purchase Linkage Upgrade

Validated on May 26, 2026 after publishing the follow-up package that stores
the paid `Purchase` ID directly in each `Disclosure` object. The automated
validation signer acted as both publisher and buyer; this tests the payment
and authorization path, while a normal UI demonstration uses a separate
connected buyer wallet.

| Artifact | Public identifier |
| --- | --- |
| Current Capsule package | `0xf71a6439bfe12645e47713e824b0c1f43f112ee187ed3510f4c155a10c01ba4d` |
| Package publish transaction | `6KiCJCnMGp5fyBxo3Tq83VQ1fwzZCc27xVnVEwqhH17a` |
| Encrypted source Walrus blob | `yGhgDDaqfqo7SMMGnB_VOni1RVKuiIJLQAOmOSfMGJI` |
| Sui Document object | `0x19ac994787ee5d97f6c5777b3a841c9c08ea1fe1110b32da637d109c622c2b1d` |
| Document registration transaction | `CN1BYPJXtoBteuCVCNvU13anqZVbi33qjJBj7Hw3BQgV` |
| Paid Purchase object | `0xbe4cb2bd02e9c5abc27344c0e44cee0d67f1dd6f79b6138b1d8d672e6a99513b` |
| Payment transaction | `Hbe8Ly6XHppAYxicRBikuYFMcfGMUdefvBCo8a9bXvcG` |
| Disclosure capsule Walrus blob | `jGYfs8xE6f6PHozmvJey6QTQiMhM3IiObLFqo9ShZZc` |
| Sui Disclosure object | `0x16bcf76f62f5aa3d85777a37cbca8feb2087298a1d144b1fcfe554fc38800e88` |
| Disclosure record transaction | `EzVZFU8cG1JNsaR6jU1euMCkpRYppyge3CwQaqeVETu3` |

The purchase paid `1000000` MIST for one synthetic line. The on-chain
`Purchase` was consumed and the `Disclosure.purchase_id` field resolves to
that same object ID. Fetching the capsule back through Walrus and verifying
its anchor returned `valid: true` and `anchored: true`.

## Seal-Encrypted Capsule Delivery

Validated on May 26, 2026 after publishing the package with the read-only
`seal_approve` policy. This run used a synthetic source and a real `1,000,000`
MIST purchase. The validation signer acted as both publisher and automated
buyer; in the UI, the buyer is the connected wallet.

| Artifact | Public identifier |
| --- | --- |
| Seal-enabled Capsule package | `0xd16496070b726a5bd60f9253b792f45362dab38546898343b31cc58d15207d32` |
| Package publish transaction | `3hKnmtzAKcjGzDt9BC9sGvCXtCdBynNUHTsfsTFnJDz2` |
| Encrypted source Walrus blob | `jYpafS3MD_Q_Kt9sg5Dub6B_wamhwgW76TuOwgtedI0` |
| Sui Document object | `0x6800dd015d69b094a5c5cda293487030ad9af2194d9fa879d74586e493829e3d` |
| Document registration transaction | `7ULrLXZtgxV9p1eZUGjCsaUudebyrqDNNybCBevss6i4` |
| Paid Purchase object / Seal identity | `0xbd1d858f5f27fbfa3ae31ab7f0f24664c63c01f95081f772d7f286ad23e005a7` |
| Payment transaction | `DZdg7RJW4CVFLyHc9rHDGdZa2i5jHPCzpUeJc6mqycf6` |
| Seal-encrypted capsule Walrus blob | `1fS7wkhP8VFwmEuYBiWoIohPHWj7Toh9bJ8ia1YzJ84` |
| Sui Disclosure object | `0xf3bb5e62ff7105a1b3f497fa50062704d9eb0ab4e85e9c8d47fc76f034deab1b` |
| Disclosure record transaction | `AYUybRAK1bjxbRhGi1VS5NBt5Mu3VkxU4zzvbFhhdP7Q` |

Fetching the Walrus capsule payload returned a Seal envelope and metadata,
not a plaintext `capsule` field. The buyer then obtained decryption material
through Seal by presenting a session for the matching paid `Purchase` object.
The decrypted content contained only:

```text
sealed purchased line one
```

Local Merkle verification of the decrypted capsule returned `valid: true`.
This integration protects delivered capsule content at rest and gates its
decryption to the paid buyer. It does not yet remove the disclosure host's AES
access to the original source document while it extracts a requested range.

## Publisher-Sealed Fixed Fragment Upgrade

Validated on May 27, 2026 with the source-keyless fixed-fragment path. The
validation constructed the Merkle proof and Seal ciphertext before calling the
host endpoint; the request contained no plaintext `content` field. The signer
acted as both publisher and automated buyer during this synthetic test.

| Artifact | Public identifier |
| --- | --- |
| Fixed-fragment Capsule package | `0xd7fbb00bee87bbc0f9f4a196dac5f6607cc22f11157e6ed9e24dfd9cd02f4112` |
| Package publish transaction | `Byn8XZrEqQdoP67voZhQkhw1ATb34HRBKek7sLCE1P9Z` |
| Document manifest Walrus blob | `-6jQwIl5qo2amt9DCnQcwC-K76hFKPrATNAhYN3NTD4` |
| Sui Document object | `0x2a8769dd14306288c9debcd587b07923d1c4d1fa96ea368b427f7860b0274262` |
| Document registration transaction | `J27dFpu1NgsaDUALWidq3XALg2UwYMCMhoGFxpNkGM75` |
| Encrypted fragment Walrus blob | `YjFJYV37rpX9XE9qm9UI_rcCJ7xiNC6K39Qb8dPYYu4` |
| Sui Fragment object | `0x678194bd04275dd5b6c35a7956c37364bee83adc336f67c2629e7d8c4c380a4f` |
| Fragment registration transaction | `D1PAdqCsZ4DVqjoFK76Mj5jBZAxszpyoEwQ8wRcTwNV9` |
| Fragment-bound Purchase object | `0x125376c66e5afed0b3e42e3fb2b4992059a5336d28a26020e6dea04be62e194a` |
| Payment transaction | `AsVFwTBv4oNJVxeF9hziNZu1N8nRokfokaD39wQsBQxD` |
| Encrypted delivery Walrus blob | `QFkdFayU0fhlnkFKYLk-oXNDSbtGUyJBtZj6pD4liuI` |
| Sui Disclosure object | `0xa8d4dc5441f7edafb0b561d311c0b6c910480b7bcb5ada1c43c1620de7220f08` |
| Disclosure record transaction | `G7cXhnPWbJsqmbGExvnn2uENTtzH8b3Qnv6ShqEkQE1S` |

The encrypted delivery wrapper fetched back from Walrus contained no plaintext
capsule. The authorized buyer decrypted only:

```text
fixed-section verified knowledge
```

Local Merkle verification returned `valid: true`, and API verification against
the on-chain document root returned `anchored: true`.

An adversarial test then created an otherwise-paid legacy `purchase_range`
receipt for the same line bounds:

| Artifact | Public identifier |
| --- | --- |
| Non-fragment Purchase object | `0xb194f1551813e068a9e99e43fb7b091ef3ee661d3b42451136507aa2503eda19` |
| Payment transaction | `B3mtxLzGX2Zbww5v4AWbArm1H1zUcD4oHJNNEvo4cNAc` |

Seal decryption was rejected because `seal_approve_fragment` requires the
paid receipt to be bound to the registered `Fragment`, not merely to have the
same line range.
