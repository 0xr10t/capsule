import { verifyCapsule } from "@capsule/sdk-typescript";
import { useMutation } from "@tanstack/react-query";
import { useCapsuleStore } from "../lib/store";
import { verifySuiDocumentAnchor } from "../lib/sui";

export function Viewer() {
  const stored = useCapsuleStore((state) => state.selectedCapsule);
  const verification = useMutation({
    mutationFn: () => {
      if (!stored) {
        throw new Error("Select a capsule from the marketplace or explorer first.");
      }
      return verifyCapsule(stored.capsule).then((result) => verifySuiDocumentAnchor(stored.capsule, result));
    },
  });
  if (!stored) {
    return (
      <section className="empty-state mt-16">
        Purchase a disclosed range or open a stored capsule to run independent local verification.
      </section>
    );
  }
  const { capsule } = stored;
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Disclosure viewer</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Proof capsule</h1>
        </div>
        <button className="primary-button compact-button" onClick={() => verification.mutate()}>
          Verify locally
        </button>
      </div>
      <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <article className="listing-card">
          <p className="mb-4 text-sm text-slate-400">
            Disclosed lines {capsule.lineRange.start + 1}-{capsule.lineRange.end + 1}
          </p>
          <pre className="capsule-content">{capsule.disclosedContent.join("\n")}</pre>
        </article>
        <article className="listing-card space-y-5 text-sm">
          <Metadata label="Capsule blob" value={stored.capsuleBlobId} />
          <Metadata label="Committed root" value={capsule.rootHash} />
          {capsule.suiDocumentId && <Metadata label="Sui document object" value={capsule.suiDocumentId} />}
          {stored.suiDisclosureId && <Metadata label="Sui disclosure object" value={stored.suiDisclosureId} />}
          <Metadata label="Payment transaction" value={capsule.paymentTx} />
          <Metadata label="Proof leaves" value={String(capsule.proof.proofs.length)} />
          {verification.data && (
            <div className={`verification ${verification.data.valid ? "valid" : "invalid"}`}>
              {verification.data.anchored
                ? "Verified against Sui anchor"
                : verification.data.valid
                  ? "Inclusion proof verified (demo mode)"
                  : "Verification failed"}
            </div>
          )}
          {verification.error && <div className="verification invalid">{verification.error.message}</div>}
        </article>
      </div>
    </section>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-200">{value}</p>
    </div>
  );
}
