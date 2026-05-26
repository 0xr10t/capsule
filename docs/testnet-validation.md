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

## Sui Anchoring

This Walrus-only storage validation was executed before a funded server-side
Sui testnet signer was configured. Therefore these validation blobs are not
represented as anchored document or disclosure objects in the UI.

After the local `SUI_PRIVATE_KEY` is configured and the Move package is
published, run a fresh testnet disclosure flow so the repository can record
the Sui package ID, document object ID, disclosure object ID, and transaction
digests alongside new Walrus blob IDs.
