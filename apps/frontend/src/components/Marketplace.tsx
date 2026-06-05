import { useMutation, useQuery } from "@tanstack/react-query";
import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import type { DocumentListing, PurchaseRequest } from "@capsule/shared-types";
import { useMemo, useState } from "react";
import { BadgeCheck, Bot, Database, FileCheck2, LockKeyhole, Search, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { capsuleClient } from "../lib/client";
import { unlockCapsule } from "../lib/seal";
import { useCapsuleStore } from "../lib/store";
import { CapsuleFeatures, featureHighlights } from "./CapsuleFeatures";
import { ReadinessPanel } from "./ReadinessPanel";
import { ContainerScroll } from "./ui/container-scroll-animation";
import { ExpandableTabs } from "./ui/expandable-tabs";
import { RaycastAnimatedBackground } from "./ui/raycast-animated-background";

function PurchasePanel({ listing }: { listing: DocumentListing }) {
  const selectCapsule = useCapsuleStore((state) => state.selectCapsule);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const signPersonalMessage = useSignPersonalMessage();
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
  const [selectedFragmentIndex, setSelectedFragmentIndex] = useState(0);
  const fixedFragment = listing.publicationMode === "publisher-sealed-fragments"
    ? listing.fragments?.[selectedFragmentIndex]
    : undefined;
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
        if (listing.publicationMode === "publisher-sealed-fragments") {
          if (!fixedFragment?.suiFragmentId) {
            throw new Error("Select a registered encrypted fragment before purchasing.");
          }
          transaction.moveCall({
            target: `${packageId}::capsule::purchase_fragment`,
            arguments: [
              transaction.object(listing.suiDocumentId),
              transaction.object(fixedFragment.suiFragmentId),
              payment,
              transaction.object.clock(),
            ],
          });
        } else {
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
        }
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
          suiFragmentId: fixedFragment?.suiFragmentId,
        };
      }
      const receipt = await capsuleClient.purchaseDisclosure(authorizedPurchase);
      const stored = await capsuleClient.createDisclosure({ purchaseId: receipt.id });
      if ("sealedCapsule" in stored) {
        if (!account) {
          throw new Error("Connect the buyer wallet to decrypt this Seal-protected capsule.");
        }
        return unlockCapsule(stored, {
          address: account.address,
          suiClient,
          signPersonalMessage: (message) => signPersonalMessage.mutateAsync({ message }),
        });
      }
      return stored;
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
          range: fixedFragment?.range ?? { start: start - 1, end: end - 1 },
          suiFragmentId: fixedFragment?.suiFragmentId,
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
        {listing.publicationMode === "publisher-sealed-fragments" ? (
          <label className="field w-52">
            Encrypted section
            <select
              onChange={(event) => setSelectedFragmentIndex(Number(event.target.value))}
              value={selectedFragmentIndex}
            >
              {listing.fragments?.map((fragment, index) => (
                <option key={fragment.sealIdentity} value={index}>
                  Lines {fragment.range.start + 1}-{fragment.range.end + 1}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
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
          </>
        )}
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
          Payment is signed in your wallet and creates a public Sui purchase receipt. Seal-enabled
          deliveries then request a second signature to decrypt locally.
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
  const categories = useMemo(() => ["All", ...Array.from(new Set(data.map((listing) => listing.category)))], [data]);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const selectedCategoryLabel = categories[selectedCategory] ?? "All";
  const visibleListings = selectedCategoryLabel === "All"
    ? data
    : data.filter((listing) => listing.category === selectedCategoryLabel);

  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07080c]/80 px-5 py-10 shadow-2xl shadow-black/30 md:px-10 md:py-14">
        <RaycastAnimatedBackground className="hidden md:block" />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/8 px-3 py-2 text-xs font-medium text-teal-100">
              <Sparkles className="size-4" />
              Walrus-native private knowledge marketplace
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl">
              Verify the excerpt.
              <br />
              Keep the source private.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Capsule lets AI agents and humans buy selected sections from private datasets,
              reports, and research notes. Each fragment arrives encrypted, provenance-rich,
              and mathematically verifiable against a Sui commitment.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button className="primary-button compact-button" onClick={() => navigate("upload")} type="button">
                Publish encrypted data
              </button>
              <button
                className="rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 hover:bg-white/[0.07]"
                onClick={() => document.getElementById("marketplace-listings")?.scrollIntoView({ behavior: "smooth" })}
                type="button"
              >
                Browse live catalog
              </button>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              {featureHighlights.map((item) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4" key={item.title}>
                  <item.icon className="size-5 text-teal-200" strokeWidth={1.6} />
                  <span className="mt-3 block text-sm text-slate-300">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
          <ReadinessPanel />
        </div>
      </section>

      <ContainerScroll
        titleComponent={
          <div className="px-2">
            <p className="eyebrow">Trustless data delivery</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl">
              From private file to verified capsule.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
              The buyer never needs the full document. The host never needs to be trusted as the source of truth.
            </p>
          </div>
        }
      >
        <div className="grid h-full grid-rows-[auto_1fr] bg-[#06070b]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-rose-400/80" />
              <span className="size-3 rounded-full bg-amber-300/80" />
              <span className="size-3 rounded-full bg-teal-300/80" />
            </div>
            <span className="rounded-full border border-teal-300/20 bg-teal-300/8 px-3 py-1 text-xs text-teal-100">
              Capsule verification console
            </span>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-[0.85fr_1.15fr] md:p-8">
            <div className="space-y-4">
              {[
                ["01", "Seal-encrypted fragment", "Walrus blob fetched without plaintext exposure"],
                ["02", "Sui purchase receipt", "Buyer, fragment, price, and timestamp are public"],
                ["03", "Merkle proof", "Disclosed lines match the committed source root"],
              ].map(([step, title, detail]) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5" key={step}>
                  <span className="font-mono text-sm text-teal-200">{step}</span>
                  <strong className="mt-3 block text-lg text-white">{title}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-slate-400">Verified capsule</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-300/10 px-3 py-1 text-xs text-teal-100">
                  <BadgeCheck className="size-4" /> valid
                </span>
              </div>
              <pre className="h-[calc(100%-3rem)] overflow-hidden whitespace-pre-wrap rounded-2xl bg-[#050609] p-5 font-mono text-xs leading-6 text-slate-300">
{`{
  "document": "Supplier Risk Report",
  "range": "lines 6-10",
  "storage": "walrus://encrypted-fragment",
  "payment": "sui::Purchase",
  "access": "Seal approved buyer",
  "proof": {
    "leafHashing": "salted-sha256-v2",
    "root": "6ab0136a...",
    "verified": true
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </ContainerScroll>

      <CapsuleFeatures />

      <section id="marketplace-listings" className="scroll-mt-28">
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">Live verified data catalog</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Synthetic public-demo datasets with real Walrus blobs, Sui anchors, and Seal-encrypted fragments.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ExpandableTabs
              selected={selectedCategory}
              tabs={categories.map((category) => ({
                title: category,
                icon: category === "All" ? Search : category.includes("AI") ? Bot : category.includes("Supplier") ? Database : FileCheck2,
              }))}
              onChange={(index) => {
                if (index !== null) {
                  setSelectedCategory(index);
                }
              }}
            />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
              {visibleListings.length} / {data.length} shown
            </span>
          </div>
        </div>
      </section>
      {isLoading && <p className="text-slate-400">Loading commitments...</p>}
      {error && <p className="text-rose-300">Start the Capsule APIs to browse live listings.</p>}
      {!isLoading && data.length === 0 && (
        <div className="empty-state">
          No datasets published yet. Upload the first encrypted source to demonstrate selective disclosure.
        </div>
      )}
      <section className="grid gap-5 lg:grid-cols-2">
        {visibleListings.map((listing) => (
          <article className="listing-card group relative overflow-hidden" key={listing.id}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/50 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="flex justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-teal-300">{listing.category}</p>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-white">{listing.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{listing.description}</p>
              </div>
              <span className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right text-sm text-slate-300">
                {listing.pricePerLineMist}
                <small className="block text-slate-500">MIST / line</small>
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 font-mono text-xs text-slate-400">
              <span>{listing.lineCount} lines</span>
              <span title={listing.rootHash}>root {listing.rootHash.slice(0, 10)}...</span>
              {listing.suiDocumentId && <span className="rounded-full bg-teal-300/10 px-2 py-1 text-teal-200">Sui anchored</span>}
              {listing.publicationMode === "publisher-sealed-fragments" && (
                <span className="rounded-full bg-teal-300/10 px-2 py-1 text-teal-200">Source keyless</span>
              )}
            </div>
            <PurchasePanel listing={listing} />
          </article>
        ))}
      </section>
    </>
  );
}
