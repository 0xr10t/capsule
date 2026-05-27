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
5. Set `SEAL_CAPSULES=true` and `VITE_PUBLISHER_SEALED_FRAGMENTS=true` to
   publish fixed sections as Seal ciphertext before they reach the host.
6. Configure the Walrus testnet publisher and aggregator endpoints if using a
   service provider other than the defaults.
7. Run `npm run dev`, connect a funded Sui testnet wallet, set the number of
   lines per purchasable section, and publish a small document. The browser
   encrypts each section before upload.
8. Select one encrypted section and approve the SUI payment transaction; it
   creates a fragment-bound `Purchase`. Approve the second wallet message to
   authorize a short-lived Seal decryption session.
9. For the durable deployment, set `DATABASE_DRIVER=postgres`, then call
   `POST /internal/reconcile` and show `GET /reconciliations`: the public
   `Document`, `Fragment`, `Purchase`, and `Disclosure` references should all
   report `verified`.

The resulting listing shows Sui anchored document and fragment objects. An
issued capsule records the paid purchase and disclosure objects. Walrus holds
ciphertext, the host never processes source plaintext in this mode, and only
the fragment-bound paid buyer decrypts content before local proof verification.
