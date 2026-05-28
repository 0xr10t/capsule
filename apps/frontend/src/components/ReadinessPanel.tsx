const walrusSiteObjectId = "0x1fde79935fe41288be57595e6f674625527af56ca66af6436694aed27d93b000";
const portalHost = "slexkmjwaz0gxjqmmj602ss891d8ny80ivihyk5xj709cudj4";

const checks = [
  {
    label: "Wallet buyer flow",
    value: "Sui dApp Kit",
    detail: "Purchases are signed by the connected buyer wallet.",
  },
  {
    label: "Live payment",
    value: "purchase_fragment",
    detail: "Exact-price SUI payment creates a public Purchase receipt.",
  },
  {
    label: "Seal access control",
    value: "Enabled",
    detail: "Paid buyer unlocks encrypted fragments through Seal policy checks.",
  },
  {
    label: "Walrus storage",
    value: "Testnet",
    detail: "Fragments, capsules, and the frontend site are stored on Walrus.",
  },
  {
    label: "Agent interface",
    value: "MCP",
    detail: "Read-only tools list, fetch, inspect, and verify capsules.",
  },
];

export function ReadinessPanel() {
  return (
    <aside className="readiness-card">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="eyebrow">Judge-ready stack</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Not a mock marketplace.</h2>
        </div>
        <span className="status-dot">Live testnet</span>
      </div>
      <div className="mt-6 grid gap-3">
        {checks.map((check) => (
          <div className="readiness-row" key={check.label}>
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.detail}</p>
            </div>
            <code>{check.value}</code>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-teal-300/15 bg-teal-300/8 p-4 text-xs leading-6 text-teal-100">
        <strong className="block text-sm text-teal-200">Walrus Site object</strong>
        <code className="mt-2 block break-all text-[11px] text-teal-100">{walrusSiteObjectId}</code>
        <span className="mt-2 block text-slate-300">
          Testnet portal host: <code className="break-all">{portalHost}</code>
        </span>
      </div>
    </aside>
  );
}
