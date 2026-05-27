# Demo Script

## Zero-Setup Judge Flow

```bash
cp .env.example .env
npm install
npm run dev
```

1. Open `http://localhost:5173`.
2. Choose **Publish encrypted data** and use the prefilled confidential agent
   report or paste a line-oriented dataset.
3. Publish. The host builds its Merkle root, encrypts the source with
   AES-256-GCM, stores its ciphertext blob, and registers only metadata with
   the marketplace.
4. In the returned marketplace listing, purchase lines `1` to `2` as the demo
   AI agent.
5. The proof capsule viewer reveals only those lines and shows its blob ID,
   committed root, payment reference, and proof count.
6. Choose **Verify locally**. The browser recomputes proof paths and reports
   **Inclusion proof verified**, including validation of the host's signed
   capsule attestation.
7. Visit **Capsules** to show that the disclosure artifact is reusable by an
   auditor or an AI ingestion pipeline.

## Testnet Variant

1. Put a funded Sui testnet `suiprivkey...` in local `.env` as
   `SUI_PRIVATE_KEY`. Do not send or commit this value.
2. Run `npm run deploy:testnet`.
3. Set both `SUI_PACKAGE_ID` and `VITE_CAPSULE_PACKAGE_ID` in `.env` to the
   public package ID printed by the deployment.
4. Set `PROTOCOL_MODE=testnet` and `STORAGE_DRIVER=walrus`.
5. Set `SEAL_CAPSULES=true` to store paid disclosure capsules as buyer-gated
   Seal ciphertext on Walrus.
6. Configure the Walrus testnet publisher and aggregator endpoints if using a
   service provider other than the defaults.
7. Run `npm run dev`, connect a funded Sui testnet wallet, and publish a small
   encrypted source document.
8. Purchase a line range from the connected wallet. Approve the SUI payment
   transaction; it creates an on-chain `Purchase` receipt. Approve the second
   wallet message to authorize a short-lived Seal decryption session.

The resulting listing shows a Sui anchored document object. An issued capsule
records the paid purchase object and a Sui disclosure object. With Seal enabled,
Walrus holds ciphertext and only the paid buyer decrypts the capsule in the
browser before local proof verification.
