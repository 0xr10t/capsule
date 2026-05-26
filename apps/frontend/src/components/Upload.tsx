import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { splitLines } from "@capsule/sdk-typescript";
import { capsuleClient } from "../lib/client";
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
  const [content, setContent] = useState(sample);
  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      capsuleClient.uploadDocument({
        title: String(form.get("title")),
        description: String(form.get("description")),
        category: String(form.get("category")),
        publisher: String(form.get("publisher")),
        pricePerLineMist: String(form.get("price")),
        content,
      }),
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
        Plaintext is processed by the disclosure host for this MVP. Only an AES-256-GCM envelope
        is sent to public blob storage; buyers receive purchased lines, never your master key.
        In testnet mode, ownership is derived from the server-side Sui signer.
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
          <button className="primary-button mt-auto" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Encrypting and committing..." : "Encrypt and publish"}
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
            <div className="stat"><strong>AES-256</strong><span>GCM</span></div>
            <div className="stat"><strong>SHA-256</strong><span>Merkle</span></div>
            <div className="stat"><strong>Walrus</strong><span>Storage</span></div>
          </div>
        </div>
      </form>
    </section>
  );
}
