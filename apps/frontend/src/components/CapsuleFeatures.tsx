import { ArrowDown, BadgeCheck, Bot, Fingerprint, LockKeyhole, Shield, Sparkles, Waves } from "lucide-react";
import { Card, CardContent } from "./ui/card";

function SignalChart() {
  return (
    <svg className="w-full text-slate-400" viewBox="0 0 386 123" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 121C3 121 15 94 36 88C57 82 67 81 67 81C67 81 80 81 91 81C103 81 100 64 109 64C117 64 118 92 125 92C133 92 142 79 154 81C165 83 186 92 193 92C200 92 205 64 213 64C221 64 238 94 243 92C249 90 258 60 265 60C271 60 283 88 286 88C294 88 299 73 304 73C311 73 321 66 334 64C346 62 347 82 362 81C378 79 383 107 383 107"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M3 123C3 123 15 94 36 88C57 82 67 81 67 81C67 81 80 81 91 81C103 81 100 64 109 64C117 64 118 92 125 92C133 92 142 79 154 81C165 83 186 92 193 92C200 92 205 64 213 64C221 64 238 94 243 92C249 90 258 60 265 60C271 60 283 88 286 88C294 88 299 73 304 73C311 73 321 66 334 64C346 62 347 82 362 81C378 79 383 107 383 107V123H3Z"
        fill="url(#capsule-chart)"
      />
      <defs>
        <linearGradient id="capsule-chart" x1="0" y1="60" x2="0" y2="123" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProofRings() {
  return (
    <div className="relative mx-auto grid size-36 place-items-center rounded-full border border-white/10 before:absolute before:-inset-3 before:rounded-full before:border before:border-white/5">
      <div className="absolute size-24 rounded-full border border-teal-300/15" />
      <div className="absolute size-16 rounded-full border border-white/10" />
      <Fingerprint className="relative size-16 text-slate-300" strokeWidth={1.2} />
      <div className="absolute h-1 w-28 rounded-full bg-teal-200 shadow-[0_0_32px_rgba(94,234,212,0.45)]" />
    </div>
  );
}

export function CapsuleFeatures() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-3xl">
          <p className="eyebrow">Why judges should care</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            A private data marketplace with proofs baked into every sale.
          </h2>
        </div>
        <div className="grid grid-cols-6 gap-4">
          <Card className="group relative col-span-full overflow-hidden lg:col-span-2">
            <CardContent className="relative grid h-full min-h-72 place-items-center p-8 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_22rem)]" />
              <div className="relative">
                <div className="relative mx-auto flex h-28 w-64 items-center justify-center">
                  <svg className="absolute inset-0 size-full text-white/10" viewBox="0 0 254 104" fill="none">
                    <path
                      d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3566 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="text-6xl font-semibold tracking-tighter text-white">100%</span>
                </div>
                <h3 className="mt-7 text-3xl font-semibold">Verifiable</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Every purchased fragment ships with Merkle proof material bound to a Sui commitment.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2">
            <CardContent className="p-8 text-center">
              <ProofRings />
              <h3 className="mt-9 text-2xl font-semibold">Source-keyless</h3>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-400">
                Publishers Seal-encrypt fixed fragments in the browser before Walrus upload.
              </p>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2">
            <CardContent className="p-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <ArrowDown className="size-4" /> Walrus fetch
                  </span>
                  <span>capsule.json</span>
                </div>
                <div className="mt-8">
                  <SignalChart />
                </div>
              </div>
              <h3 className="mt-9 text-center text-2xl font-semibold">Durable by design</h3>
              <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-7 text-slate-400">
                Encrypted fragments and delivery wrappers become permanent, replayable Walrus artifacts.
              </p>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden lg:col-span-3">
            <CardContent className="grid min-h-72 gap-8 p-8 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-between gap-10">
                <div className="grid size-16 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
                  <Shield className="size-7 text-teal-200" strokeWidth={1.4} />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">Paid access, not blind trust</h3>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
                    Sui purchase receipts bind buyer, fragment, price, and disclosure provenance into public state.
                  </p>
                </div>
              </div>
              <div className="rounded-tl-[1.5rem] border-l border-t border-white/10 bg-white/[0.025] p-6">
                <div className="mb-5 flex gap-1">
                  <span className="size-2 rounded-full bg-white/20" />
                  <span className="size-2 rounded-full bg-white/15" />
                  <span className="size-2 rounded-full bg-white/10" />
                </div>
                {["purchase_fragment", "seal_approve_fragment", "record_disclosure"].map((item, index) => (
                  <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/8 bg-black/20 p-4" key={item}>
                    <span className="grid size-8 place-items-center rounded-full bg-teal-300/10 text-xs text-teal-200">
                      {index + 1}
                    </span>
                    <code className="text-sm text-slate-300">{item}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden lg:col-span-3">
            <CardContent className="grid min-h-72 gap-8 p-8 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-between gap-10">
                <div className="grid size-16 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
                  <Bot className="size-8 text-teal-200" strokeWidth={1.4} />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">Agent-ready knowledge</h3>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
                    Capsules are stable JSON artifacts that MCP tools can inspect, fetch, and verify.
                  </p>
                </div>
              </div>
              <div className="relative flex flex-col justify-center gap-5">
                {([
                  ["Research agent", "Supplier risk"],
                  ["RAG pipeline", "Verified excerpt"],
                  ["Human buyer", "Diligence memo"],
                ] as Array<[string, string]>).map(([name, label], index) => (
                  <div
                    className={`relative flex items-center gap-3 ${index % 2 === 0 ? "justify-end pr-8" : "justify-start pl-8"}`}
                    key={name}
                  >
                    <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                      {label}
                    </span>
                    <span className="grid size-10 place-items-center rounded-full border border-white/10 bg-[#11131a] text-xs font-semibold text-teal-200">
                      {name.slice(0, 2)}
                    </span>
                  </div>
                ))}
                <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export const featureHighlights = [
  { title: "Seal encrypted", icon: LockKeyhole },
  { title: "Walrus native", icon: Waves },
  { title: "Sui anchored", icon: BadgeCheck },
  { title: "Agent ready", icon: Sparkles },
];
