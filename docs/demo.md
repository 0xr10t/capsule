# Demo Script

## Primary Judge Flow: Seal Fixed Fragments

This is the trust-minimized Capsule product path. Use this for judging,
recordings, and live walkthroughs.

```bash
cp .env.example .env
npm install
npm run dev
```

For the hosted testnet demo, use the already configured Render services and
seeded marketplace listing. For a local testnet run, configure:

```bash
PROTOCOL_MODE=testnet
STORAGE_DRIVER=walrus
SEAL_CAPSULES=true
VITE_PUBLISHER_SEALED_FRAGMENTS=true
SUI_PACKAGE_ID=0x...
VITE_CAPSULE_PACKAGE_ID=0x...
SUI_PRIVATE_KEY=suiprivkey...
```

Never commit or share `SUI_PRIVATE_KEY`.

1. Open the frontend and connect a funded Sui testnet wallet.
2. Open **Marketplace** and point out the seeded AI-data listings, such as
   `Supplier Risk Report — Battery Supply Chain` or
   `Private Crypto Protocol Diligence Report`.
3. Select a fixed sellable fragment. Explain that the publisher browser has
   already split the source document into fixed sections, built salted Merkle
   proofs, and Seal-encrypted each section before upload.
4. Approve the SUI `purchase_fragment` transaction. Sui creates a public
   fragment-bound `Purchase` receipt and transfers exact-price payment to the
   publisher.
5. Generate the disclosure. The host validates the paid receipt, fetches only
   the encrypted fragment from Walrus, writes a ciphertext-only delivery
   wrapper back to Walrus, and records disclosure provenance on Sui.
6. Approve the short-lived Seal wallet session. Seal checks
   `seal_approve_fragment` against the Sui purchase and releases decryption
   material only to the paid buyer.
7. The browser decrypts locally and verifies the disclosed lines with their
   Merkle proof against the Sui-anchored root.
8. Show the success state: **Verified against the publisher's Sui commitment**.
9. Show the Walrus blob IDs and Sui object IDs so the judge can inspect the
   durable off-chain artifact and public on-chain provenance.

The important sentence for the demo:

> The disclosure host never receives the full source document or its source
> encryption key in the publisher-sealed fixed-fragment path.

## What To Emphasize

- Capsule is a Walrus-native file/data marketplace for AI agents and humans.
- Walrus stores encrypted fragments, manifests, and replayable capsules.
- Sui stores commitments, exact-price payments, purchase receipts, and
  disclosure provenance.
- Seal gates decryption using Sui purchase authorization.
- Merkle proofs prove inclusion relative to the publisher's Sui commitment.
- Capsule proves provenance and inclusion, not truth, ownership, or regulatory
  compliance by itself.

## Legacy Local-Only Compatibility Mode

This mode exists only so a reviewer can run something with no Sui key, no
Walrus account, and no Seal setup. It is not the trust-minimized product path.
Do not use it as the main submission demo.

```bash
STORAGE_DRIVER=memory
PROTOCOL_MODE=demo
VITE_PUBLISHER_SEALED_FRAGMENTS=false
npm run dev
```

In this compatibility mode, the host accepts plaintext from the local browser,
builds the Merkle root, encrypts the source with AES-256-GCM, and stores the
ciphertext in local memory or the configured storage provider. This is useful
for testing arbitrary line ranges, but it weakens the product story because the
host can see plaintext during publication.

If a judge asks about it, answer plainly:

> AES mode is a local compatibility path. The product architecture is the
> Seal fixed-fragment path, where encryption happens in the publisher browser
> and the host receives ciphertext only.

## Testnet Operations Checklist

1. Put a funded Sui testnet `suiprivkey...` in local `.env` as
   `SUI_PRIVATE_KEY`.
2. Run `npm run deploy:testnet` if deploying a fresh package.
3. Set both `SUI_PACKAGE_ID` and `VITE_CAPSULE_PACKAGE_ID` to the deployed
   package ID.
4. Set `PROTOCOL_MODE=testnet`, `STORAGE_DRIVER=walrus`,
   `SEAL_CAPSULES=true`, and `VITE_PUBLISHER_SEALED_FRAGMENTS=true`.
5. Configure Walrus publisher and aggregator endpoints if not using defaults.
6. Run `npm run dev` or use the hosted Render services.
7. After a purchase/disclosure, call `POST /internal/reconcile` on the
   marketplace API and show `GET /reconciliations`.

The resulting listing should expose public Sui `Document`, `Fragment`,
`Purchase`, and `Disclosure` objects. Walrus should hold only ciphertext in
the trust-minimized path, and the buyer should decrypt locally only after Seal
approves the fragment-bound paid purchase.
