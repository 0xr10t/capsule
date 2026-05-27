import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { buildMerkleTree, generateRangeProof, splitLines } from "@capsule/sdk-typescript";
import { useSuiClient } from "@mysten/dapp-kit";
import { capsuleClient } from "../lib/client";
import { sealFragmentForPublication } from "../lib/seal";
import { useCapsuleStore } from "../lib/store";

const sample = [
  "Title: Autonomous agent risk report",
  "Sample population: 4,280 transactions",
  "Critical anomalies: 17",
  "Confidence interval: 98.4%",
  "Recommendation: trigger independent audit",
].join("\n");

export function Upload() {
  const queryClient = useQueryClient();
  const navigate = useCapsuleStore((state) => state.navigate);
  const suiClient = useSuiClient();
  const packageId = import.meta.env.VITE_CAPSULE_PACKAGE_ID as string | undefined;
  const sealedPublication = import.meta.env.VITE_PUBLISHER_SEALED_FRAGMENTS === "true";
  const [content, setContent] = useState(sample);
  const [fragmentSize, setFragmentSize] = useState(1);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const metadata = {
        title: String(form.get("title")),
        description: String(form.get("description")),
        category: String(form.get("category")),
        publisher: String(form.get("publisher")),
        pricePerLineMist: String(form.get("price")),
      };
      if (!sealedPublication) {
        return capsuleClient.uploadDocument({ ...metadata, content });
      }
      if (!packageId) {
        throw new Error("Configure VITE_CAPSULE_PACKAGE_ID for publisher-side Seal fragments.");
      }
      const merkle = await buildMerkleTree(lines);
      const fragments = [];
      for (let start = 0; start < lines.length; start += fragmentSize) {
        const end = Math.min(lines.length - 1, start + fragmentSize - 1);
        fragments.push(await sealFragmentForPublication({
          version: "1",
          rootHash: merkle.rootHash,
          lineRange: { start, end },
          disclosedContent: lines.slice(start, end + 1),
          proof: await generateRangeProof(lines, start, end),
        }, packageId, suiClient));
      }
      return capsuleClient.uploadSealedDocument({
        ...metadata,
        rootHash: merkle.rootHash,
        lineCount: lines.length,
        fragments,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate("marketplace");
    },
  });
  const lines = splitLines(content);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <section>
      <p className="eyebrow">Publisher studio</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Commit an encrypted dataset</h1>
      <p className="mt-4 max-w-2xl text-slate-400">
        {sealedPublication
          ? "Your browser builds proofs and Seal-encrypts fixed purchasable sections. The host receives only ciphertext before anchoring the manifest and sections on Sui."
          : "Plaintext is processed by the disclosure host in compatibility mode. Enable publisher-side Seal fragments for the trust-minimized testnet flow."}
      </p>
      <form className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" onSubmit={submit}>
        <div className="listing-card flex flex-col gap-5">
          <label className="field">
            Dataset title
            <input defaultValue="Autonomous Agent Risk Report" name="title" required />
          </label>
          <label className="field">
            Summary
            <textarea defaultValue="Confidential telemetry available as verified fragments." name="description" rows={3} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="field">
              Category
              <input defaultValue="AI safety" name="category" required />
            </label>
            <label className="field">
              MIST / line
              <input defaultValue="2500000" min="0" name="price" type="number" required />
            </label>
          </div>
          <label className="field">
            Publisher address
            <input defaultValue="0xpublisher-demo" name="publisher" required />
          </label>
          {sealedPublication && (
            <label className="field">
              Lines per purchasable section
              <input
                min={1}
                max={Math.max(1, lines.length)}
                onChange={(event) => setFragmentSize(Number(event.target.value))}
                type="number"
                value={fragmentSize}
              />
            </label>
          )}
          <button className="primary-button mt-auto" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Encrypting and committing..." : sealedPublication ? "Seal and publish sections" : "Encrypt and publish"}
          </button>
          {mutation.error && <p className="text-sm text-rose-300">{mutation.error.message}</p>}
        </div>
        <div className="listing-card">
          <div className="mb-4 flex justify-between text-sm text-slate-400">
            <span>Source preview</span>
            <span>{lines.length} Merkle leaves</span>
          </div>
          <textarea
            className="source-editor"
            onChange={(event) => setContent(event.target.value)}
            rows={16}
            value={content}
          />
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="stat"><strong>{sealedPublication ? "Seal" : "AES-256"}</strong><span>{sealedPublication ? "Client-side" : "GCM"}</span></div>
            <div className="stat"><strong>SHA-256</strong><span>Merkle</span></div>
            <div className="stat"><strong>Walrus</strong><span>Storage</span></div>
          </div>
        </div>
      </form>
    </section>
  );
}
