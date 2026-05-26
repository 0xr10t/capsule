import { useQuery } from "@tanstack/react-query";
import type { StoredCapsule } from "@capsule/shared-types";
import { useCapsuleStore } from "../lib/store";

const marketplace = import.meta.env.VITE_MARKETPLACE_API_URL ?? "http://localhost:4000";

export function Explorer() {
  const selectCapsule = useCapsuleStore((state) => state.selectCapsule);
  const { data = [] } = useQuery({
    queryKey: ["capsules"],
    queryFn: async () => {
      const response = await fetch(`${marketplace}/capsules`);
      if (!response.ok) {
        throw new Error("Could not retrieve capsule archive");
      }
      return response.json() as Promise<StoredCapsule[]>;
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
        {data.map((stored) => (
          <button className="archive-row" key={stored.capsule.capsuleId} onClick={() => selectCapsule(stored)}>
            <span>
              <strong>{stored.capsule.documentId.slice(0, 12)}...</strong>
              <small>
                Lines {stored.capsule.lineRange.start + 1}-{stored.capsule.lineRange.end + 1}
              </small>
            </span>
            <span className="font-mono text-xs text-slate-400">{stored.capsuleBlobId.slice(0, 30)}...</span>
            <span className="text-teal-300">{stored.suiDisclosureId ? "On-chain proof ->" : "Inspect proof ->"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
