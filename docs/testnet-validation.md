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
