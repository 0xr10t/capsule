import { useMutation, useQuery } from "@tanstack/react-query";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import type { DocumentListing, PurchaseRequest } from "@capsule/shared-types";
import { useState } from "react";
import { capsuleClient } from "../lib/client";
import { useCapsuleStore } from "../lib/store";

function PurchasePanel({ listing }: { listing: DocumentListing }) {
  const selectCapsule = useCapsuleStore((state) => state.selectCapsule);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = import.meta.env.VITE_CAPSULE_PACKAGE_ID as string | undefined;
  const isAnchoredListing = Boolean(listing.suiDocumentId);
  const walletTransaction = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showRawEffects: true, showEffects: true, showObjectChanges: true },
      }),
  });
  const [buyer, setBuyer] = useState("0xai-agent-demo");
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(Math.min(2, listing.lineCount));
  const mutation = useMutation({
    mutationFn: async (purchase: PurchaseRequest) => {
      let authorizedPurchase = purchase;
      if (isAnchoredListing) {
        if (!packageId) {
          throw new Error("Configure VITE_CAPSULE_PACKAGE_ID before purchasing anchored disclosures.");
        }
        if (!account || !listing.suiDocumentId) {
          throw new Error("Connect a Sui wallet to purchase this anchored disclosure.");
        }
        const amountMist = BigInt(purchase.range.end - purchase.range.start + 1) * BigInt(listing.pricePerLineMist);
        const transaction = new Transaction();
        const [payment] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amountMist)]);
        transaction.moveCall({
          target: `${packageId}::capsule::purchase_range`,
          arguments: [
            transaction.object(listing.suiDocumentId),
            transaction.pure.u64(purchase.range.start),
            transaction.pure.u64(purchase.range.end),
            payment,
            transaction.object.clock(),
          ],
        });
        const execution = await walletTransaction.mutateAsync({
          transaction,
          chain: import.meta.env.VITE_SUI_NETWORK === "mainnet" ? "sui:mainnet" : "sui:testnet",
        });
        const createdPurchase = execution.objectChanges?.find(
          (change) => change.type === "created" && change.objectType === `${packageId}::capsule::Purchase`,
        );
        if (!createdPurchase || createdPurchase.type !== "created") {
          throw new Error("Sui payment succeeded without creating a Capsule Purchase receipt.");
        }
        authorizedPurchase = {
          ...purchase,
          buyer: account.address,
          paymentTx: execution.digest,
          suiPurchaseId: createdPurchase.objectId,
        };
      }
      const receipt = await capsuleClient.purchaseDisclosure(authorizedPurchase);
      return capsuleClient.createDisclosure({ purchaseId: receipt.id });
    },
    onSuccess: selectCapsule,
  });

  return (
    <form
      className="mt-7 grid gap-3 border-t border-white/8 pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({
          documentId: listing.id,
          buyer: isAnchoredListing && account ? account.address : buyer,
          range: { start: start - 1, end: end - 1 },
        });
      }}
    >
      <div className="flex gap-3">
        <label className="field grow">
          Buyer or agent
          <input
            disabled={isAnchoredListing}
            value={isAnchoredListing ? account?.address ?? "Connect wallet to purchase" : buyer}
            onChange={(event) => setBuyer(event.target.value)}
            required
          />
        </label>
        <label className="field w-20">
          From
          <input
            min={1}
            max={listing.lineCount}
            type="number"
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
          />
        </label>
        <label className="field w-20">
          To
          <input
            min={start}
            max={listing.lineCount}
            type="number"
            value={end}
            onChange={(event) => setEnd(Number(event.target.value))}
          />
        </label>
      </div>
      <button className="primary-button" disabled={mutation.isPending || (isAnchoredListing && !account)} type="submit">
        {mutation.isPending
          ? "Building verified capsule..."
          : isAnchoredListing
            ? account
              ? "Pay on Sui and disclose"
              : "Connect wallet to purchase"
            : "Buy selected lines"}
      </button>
      {isAnchoredListing && (
        <p className="text-xs leading-5 text-slate-400">
          Payment is signed in your wallet and creates a public one-use Sui purchase receipt.
        </p>
      )}
      {mutation.error && <p className="text-sm text-rose-300">{mutation.error.message}</p>}
    </form>
  );
}

export function Marketplace() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: () => capsuleClient.listDocuments(),
  });
  const navigate = useCapsuleStore((state) => state.navigate);
  return (
    <>
      <section className="grid gap-10 pb-12 lg:grid-cols-[1.18fr_0.82fr]">
        <div>
          <p className="eyebrow">Walrus-native knowledge commerce</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
            Buy the proof,
            <br />
            not the whole file.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
            Encrypted datasets live on Walrus. Every purchased fragment carries a Merkle proof
            against a Sui-ready commitment, independently verifiable by an agent or a person.
          </p>
          <button className="primary-button mt-9 w-auto px-7" onClick={() => navigate("upload")}>
            Publish encrypted data
          </button>
        </div>
        <div className="protocol-card mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Protocol sequence</span>
            <span className="status-dot">Verifiable</span>
          </div>
          {["Encrypt source locally", "Store ciphertext on Walrus", "Anchor SHA-256 root on Sui", "Mint proof capsule"].map(
            (item, index) => (
              <div className="flow-row" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ),
          )}
        </div>
      </section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Verified datasets</h2>
        </div>
        <span className="rounded-full bg-white/[0.05] px-4 py-2 text-sm text-slate-300">
          {data.length} active commitments
        </span>
      </div>
      {isLoading && <p className="text-slate-400">Loading commitments...</p>}
      {error && <p className="text-rose-300">Start the Capsule APIs to browse live listings.</p>}
      {!isLoading && data.length === 0 && (
        <div className="empty-state">
          No datasets published yet. Upload the first encrypted source to demonstrate selective disclosure.
        </div>
      )}
      <section className="grid gap-5 lg:grid-cols-2">
        {data.map((listing) => (
          <article className="listing-card" key={listing.id}>
            <div className="flex justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-teal-300">{listing.category}</p>
                <h3 className="mt-3 text-xl font-medium">{listing.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{listing.description}</p>
              </div>
              <span className="shrink-0 text-right text-sm text-slate-300">
                {listing.pricePerLineMist}
                <small className="block text-slate-500">MIST / line</small>
              </span>
            </div>
            <div className="mt-5 flex gap-5 font-mono text-xs text-slate-400">
              <span>{listing.lineCount} lines</span>
              <span title={listing.rootHash}>root {listing.rootHash.slice(0, 10)}...</span>
              {listing.suiDocumentId && <span className="text-teal-300">Sui anchored</span>}
            </div>
            <PurchasePanel listing={listing} />
          </article>
        ))}
      </section>
    </>
  );
}
