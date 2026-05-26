import { useMutation, useQuery } from "@tanstack/react-query";
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import type { CapsuleRecord } from "@capsule/shared-types";
import { isSealedCapsule, unlockCapsule } from "../lib/seal";
import { useCapsuleStore } from "../lib/store";

const marketplace = import.meta.env.VITE_MARKETPLACE_API_URL ?? "http://localhost:4000";

export function Explorer() {
  const { data = [] } = useQuery({
    queryKey: ["capsules"],
    queryFn: async () => {
      const response = await fetch(`${marketplace}/capsules`);
      if (!response.ok) {
        throw new Error("Could not retrieve capsule archive");
      }
      return response.json() as Promise<CapsuleRecord[]>;
    },
  });
  return (
    <section>
      <p className="eyebrow">Walrus provenance archive</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Disclosure capsules</h1>
      <p className="mt-4 max-w-2xl text-slate-400">
        Immutable, replayable artifacts prepared for audit trails and AI retrieval pipelines.
      </p>
      <div className="mt-10 space-y-4">
        {data.length === 0 && <div className="empty-state">No disclosure capsules have been minted yet.</div>}
        {data.map((stored) => <ArchiveRow key={("capsule" in stored ? stored.capsule : stored.summary).capsuleId} stored={stored} />)}
      </div>
    </section>
  );
}

function ArchiveRow({ stored }: { stored: CapsuleRecord }) {
  const selectCapsule = useCapsuleStore((state) => state.selectCapsule);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const signPersonalMessage = useSignPersonalMessage();
  const summary = "capsule" in stored ? stored.capsule : stored.summary;
  const unlock = useMutation({
    mutationFn: async () => {
      if (isSealedCapsule(stored) && !account) {
        throw new Error("Connect the purchasing wallet to unlock this Seal-protected capsule.");
      }
      return unlockCapsule(stored, {
        address: account?.address ?? "",
        suiClient,
        signPersonalMessage: (message) => signPersonalMessage.mutateAsync({ message }),
      });
    },
    onSuccess: selectCapsule,
  });
  return (
    <>
      <button className="archive-row" onClick={() => unlock.mutate()}>
        <span>
          <strong>{summary.documentId.slice(0, 12)}...</strong>
          <small>Lines {summary.lineRange.start + 1}-{summary.lineRange.end + 1}</small>
        </span>
        <span className="font-mono text-xs text-slate-400">{stored.capsuleBlobId.slice(0, 30)}...</span>
        <span className="text-teal-300">
          {isSealedCapsule(stored) ? (unlock.isPending ? "Unlocking..." : "Unlock with Seal ->") : "Inspect proof ->"}
        </span>
      </button>
      {unlock.error && <p className="text-sm text-rose-300">{unlock.error.message}</p>}
    </>
  );
}
