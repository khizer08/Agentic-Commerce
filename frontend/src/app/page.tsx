/**
 * app/page.tsx
 *
 * OTC Trustless Swap — "Future of Finance" Dashboard
 *
 * Layout (desktop):
 * ┌─────────────────────────────────────────────────────────┐
 * │  HEADER: logo · tagline · wallet connect                │
 * ├──────────────────────────────────────┬──────────────────┤
 * │  LEFT COLUMN                         │  RIGHT COLUMN    │
 * │  ┌─ DEAL PANEL ─────────────────┐   │  ┌─ REGISTRY ─┐  │
 * │  │  DealForm                    │   │  │  Stats     │  │
 * │  └──────────────────────────────┘   │  └────────────┘  │
 * │                                      │  ┌─ HOW IT ──┐  │
 * │                                      │  │  WORKS    │  │
 * │                                      │  └───────────┘  │
 * ├──────────────────────────────────────┴──────────────────┤
 * │  FOOTER: pitch + links                                   │
 * └─────────────────────────────────────────────────────────┘
 */

import WalletConnect from "@/components/WalletConnect";
import DealForm from "@/components/DealForm";
import RegistryStats from "@/components/RegistryStats";

// ─── Step card for "How It Works" sidebar ─────────────────────────────────────

function Step({
  index,
  title,
  description,
  color,
}: {
  index: number;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold ${color}`}
      >
        {index}
      </div>
      <div>
        <p className="text-xs font-display font-bold text-white mb-0.5">{title}</p>
        <p className="text-xs font-body text-algo-muted leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen grid-bg relative">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-green absolute -top-32 -left-32 w-[600px] h-[600px]" />
        <div className="glow-blue absolute top-1/2 -right-48 w-[500px] h-[500px]" />
        <div className="glow-green absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-50" />
      </div>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-algo-border bg-algo-panel/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-9 h-9 rounded-xl bg-algo-green/10 border border-algo-green/30 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-algo-green"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"
                />
              </svg>
            </div>

            <div>
              <h1 className="font-display text-sm font-bold text-white tracking-tight leading-none">
                OTC Trustless Swap
              </h1>
              <p className="font-display text-[10px] text-algo-green/80 tracking-widest uppercase mt-0.5">
                Atomic Settlement · Algorand L1
              </p>
            </div>
          </div>

          {/* Hackathon badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-algo-border bg-algo-dark/60">
            <span className="w-1.5 h-1.5 rounded-full bg-algo-accent animate-pulse-slow" />
            <span className="font-display text-[10px] text-algo-muted uppercase tracking-widest">
              Hack.Algo · REVA Edition
            </span>
          </div>

          {/* Wallet connect */}
          <WalletConnect />
        </div>
      </header>

      {/* ── HERO TAGLINE ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="text-center space-y-2 animate-slide-up">
          <p className="font-display text-[10px] text-algo-green uppercase tracking-[0.3em]">
            Future of Finance · Agentic Commerce
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
            Trustless OTC Settlement
          </h2>
          <p className="font-body text-algo-muted max-w-xl mx-auto text-sm leading-relaxed">
            Three parties. One atomic group. Zero counterparty risk.
            Alice, Bob, and Charlie settle on-chain in a single Algorand transaction batch —
            verified by a TealScript smart contract with no escrow and no intermediary custody.
          </p>
        </div>

        {/* Atomic group flow diagram */}
        <div className="mt-8 flex items-center justify-center gap-1 flex-wrap">
          {[
            { label: "Opt-In*", sublabel: "Alice → Alice", color: "border-algo-muted/40 text-algo-muted" },
            null,
            { label: "ALGO Pay", sublabel: "Alice → Bob", color: "border-algo-green/50 text-algo-green" },
            null,
            { label: "ASA Send", sublabel: "Bob → Alice", color: "border-algo-accent/50 text-algo-accent" },
            null,
            { label: "5% Fee", sublabel: "Alice → Charlie", color: "border-purple-500/50 text-purple-400" },
            null,
            { label: "App Call", sublabel: "→ DealRegistry", color: "border-yellow-500/50 text-yellow-400" },
          ].map((item, i) =>
            item === null ? (
              <svg
                key={i}
                className="w-5 h-5 text-algo-border flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg border bg-algo-panel text-center min-w-[80px] ${item.color}`}
              >
                <p className="font-display text-[10px] font-bold tracking-wide">{item.label}</p>
                <p className="font-display text-[9px] text-algo-muted mt-0.5">{item.sublabel}</p>
              </div>
            )
          )}
        </div>
        <p className="text-center font-display text-[9px] text-algo-muted mt-2">
          * Opt-In prepended only if Alice has not opted into the ASA
        </p>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Deal Panel (2 cols) ───────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-algo-border bg-algo-panel p-6 shadow-xl shadow-black/30">
              {/* Panel header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-algo-green/10 border border-algo-green/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-algo-green"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    Execute Atomic Deal
                  </h3>
                  <p className="font-display text-xs text-algo-muted">
                    Fill in deal terms · Sign with your wallet · Settle on-chain
                  </p>
                </div>
              </div>

              <DealForm />
            </div>
          </div>

          {/* ── RIGHT: Sidebar (1 col) ──────────────────────────────────────── */}
          <div className="space-y-5">
            {/* On-chain stats */}
            <RegistryStats />

            {/* How It Works */}
            <div className="rounded-2xl border border-algo-border bg-algo-panel p-5 space-y-4">
              <h3 className="font-display text-sm font-bold text-white">
                How It Works
              </h3>
              <div className="space-y-4">
                <Step
                  index={1}
                  title="Connect Wallets"
                  description="Alice (buyer) connects her wallet. Bob (seller) and Charlie (agent) are identified by address."
                  color="bg-algo-green/10 text-algo-green border border-algo-green/20"
                />
                <Step
                  index={2}
                  title="Input Deal Terms"
                  description="Alice enters the Asset ID, ASA units desired, and the ALGO she'll pay Bob."
                  color="bg-algo-accent/10 text-algo-accent border border-algo-accent/20"
                />
                <Step
                  index={3}
                  title="Atomic Group Built"
                  description="The SDK constructs a 4-5 transaction group with a shared Group ID. Altering any transaction invalidates all others."
                  color="bg-purple-500/10 text-purple-400 border border-purple-500/20"
                />
                <Step
                  index={4}
                  title="Multi-Party Sign & Submit"
                  description="Alice signs her transactions. Bob co-signs the ASA transfer. The group is submitted atomically — all succeed or all revert."
                  color="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                />
                <Step
                  index={5}
                  title="Registry Verifies On-Chain"
                  description="The DealRegistry TealScript contract reads the group context, enforces the 5% fee invariant, and logs the deal permanently."
                  color="bg-red-500/10 text-red-400 border border-red-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER — Pitch ────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-algo-border bg-algo-panel/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
          {/* Scalable System Design Pitch */}
          <div className="rounded-xl border border-algo-border/60 bg-algo-dark/40 p-5">
            <p className="font-display text-[10px] text-algo-green uppercase tracking-widest mb-2">
              Scalable System Design · Judging Criteria
            </p>
            <p className="font-body text-sm text-algo-muted leading-relaxed max-w-4xl">
              <span className="text-white font-medium">
                Algorand's Layer-1 atomic groups provide cryptographic settlement finality in ~3.5 seconds
                with no off-chain escrow, oracle, or intermediary state
              </span>
              — eliminating the coordination bottleneck that plagues multi-step OTC flows on other chains.
              The TealScript <span className="text-algo-green font-medium">DealRegistry</span> contract
              acts as a lightweight on-chain verifier rather than a custodian: it reads the group context
              (amounts, asset IDs, receiver addresses) and rejects any group that violates the fee invariant,
              meaning enforcement logic scales horizontally with every validator node at zero marginal cost.
              Finally, the agentic matchmaker (Charlie) is{" "}
              <span className="text-algo-accent font-medium">stateless</span> — it constructs and co-signs
              transaction groups without holding funds, so any number of agents can operate concurrently
              without contention, making the system linearly scalable to market demand.
            </p>
          </div>

          {/* Footer links */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="font-display text-[10px] text-algo-muted uppercase tracking-widest">
              Built with TealScript · algosdk · Next.js · @txnlab/use-wallet
            </p>
            <div className="flex gap-4">
              <a
                href="https://developer.algorand.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[10px] text-algo-muted hover:text-algo-green transition-colors uppercase tracking-widest"
              >
                Algorand Docs ↗
              </a>
              <a
                href="https://github.com/algorandfoundation/algokit-utils-ts"
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[10px] text-algo-muted hover:text-algo-green transition-colors uppercase tracking-widest"
              >
                AlgoKit ↗
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
