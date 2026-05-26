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
   **Authenticity verified**.
7. Visit **Capsules** to show that the disclosure artifact is reusable by an
   auditor or an AI ingestion pipeline.

## Testnet Variant

1. Set `STORAGE_DRIVER=walrus` in `.env` and configure testnet publisher and
   aggregator endpoints.
2. Build and publish `packages/sui-contracts` with the Sui CLI.
3. Set `VITE_CAPSULE_PACKAGE_ID` to the resulting package ID.
4. Connect a Sui testnet wallet in the UI.

The Move functions are available for document and disclosure provenance. The
UI transaction calls remain deliberately labeled as future testnet wiring until
the wallet flow records returned object IDs back into marketplace metadata.

