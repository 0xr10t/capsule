import { ConnectButton } from "@mysten/dapp-kit";
import { Archive, BadgeCheck, Store, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { type Page, useCapsuleStore } from "../lib/store";
import { ExpandableTabs } from "./ui/expandable-tabs";

const routes: Array<{ id: Page; label: string; icon: typeof Store }> = [
  { id: "marketplace", label: "Market", icon: Store },
  { id: "upload", label: "Publish", icon: UploadCloud },
  { id: "viewer", label: "Verify", icon: BadgeCheck },
  { id: "explorer", label: "Capsules", icon: Archive },
];

export function Layout({ children }: { children: ReactNode }) {
  const page = useCapsuleStore((state) => state.page);
  const navigate = useCapsuleStore((state) => state.navigate);
  const selectedRouteIndex = routes.findIndex((route) => route.id === page);
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#050609]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(94,234,212,0.13),transparent_26rem),radial-gradient(circle_at_84%_2%,rgba(148,163,184,0.11),transparent_24rem),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_24rem)]" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050609]/78 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 md:px-6">
          <button className="flex items-center gap-3" onClick={() => navigate("marketplace")} type="button">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-cyan-200/20 bg-cyan-300/10 shadow-[0_0_42px_rgba(34,211,238,0.28)]">
              <img
                alt=""
                className="h-full w-full origin-[58%_70%] scale-[2.05] object-cover object-center"
                draggable={false}
                src="/capsule_icon.png"
              />
            </span>
            <span className="text-left">
              <span className="block font-semibold tracking-tight text-white">Capsule</span>
              <span className="hidden text-xs text-slate-500 sm:block">Verifiable private knowledge</span>
            </span>
          </button>
          <nav className="hidden md:block">
            <ExpandableTabs
              selected={selectedRouteIndex}
              tabs={routes.map((route) => ({ title: route.label, icon: route.icon }))}
              onChange={(index) => {
                if (index !== null) {
                  navigate(routes[index]!.id);
                }
              }}
            />
          </nav>
          <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-[#08090d]/90 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
            {routes.map((route) => (
              <button
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition ${
                  route.id === page ? "bg-teal-300 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
                key={route.id}
                onClick={() => navigate(route.id)}
                type="button"
              >
                <route.icon className="size-4" />
                {route.label}
              </button>
            ))}
          </nav>
          <div className="shrink-0">
            <ConnectButton connectText="Connect wallet" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 pb-28 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
