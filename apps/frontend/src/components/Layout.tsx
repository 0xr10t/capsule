import { ConnectButton } from "@mysten/dapp-kit";
import type { ReactNode } from "react";
import { type Page, useCapsuleStore } from "../lib/store";

const routes: Array<{ id: Page; label: string }> = [
  { id: "marketplace", label: "Marketplace" },
  { id: "upload", label: "Publish" },
  { id: "viewer", label: "Verify" },
  { id: "explorer", label: "Capsules" },
];

export function Layout({ children }: { children: ReactNode }) {
  const page = useCapsuleStore((state) => state.page);
  const navigate = useCapsuleStore((state) => state.navigate);
  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-white/8 bg-[#080d16]/85 backdrop-blur-xl sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-5">
          <button className="flex items-center gap-3" onClick={() => navigate("marketplace")}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-300 text-lg font-bold text-slate-950">
              C
            </span>
            <span className="text-left">
              <span className="block font-semibold tracking-tight">Capsule</span>
            </span>
          </button>
          <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1 md:flex">
            {routes.map((route) => (
              <button
                className={`rounded-full px-5 py-2 text-sm transition ${
                  route.id === page ? "bg-teal-300 text-slate-950" : "text-slate-300 hover:text-white"
                }`}
                key={route.id}
                onClick={() => navigate(route.id)}
              >
                {route.label}
              </button>
            ))}
          </nav>
          <ConnectButton connectText="Connect Sui wallet" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}

