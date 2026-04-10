/**
 * components/RegistryStats.tsx
 *
 * Reads the DealRegistry global state from algod and displays
 * the most recent deal in a live stats panel.
 *
 * Polls every 5 seconds to pick up new settlements.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDealRegistryState } from "@/lib/algorand";

const DEAL_REGISTRY_APP_ID = Number(
  process.env.NEXT_PUBLIC_DEAL_REGISTRY_APP_ID ?? 0
);

function truncate(addr: string | number): string {
  const s = String(addr);
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-algo-border/50 last:border-0">
      <span className="text-xs font-display text-algo-muted uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xs font-display font-bold ${
          highlight ? "text-algo-green" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function RegistryStats() {
  const [state, setState] = useState<Record<string, string | number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchState = useCallback(async () => {
    if (DEAL_REGISTRY_APP_ID === 0) {
      setError("App ID not configured. Set NEXT_PUBLIC_DEAL_REGISTRY_APP_ID.");
      return;
    }
    try {
      const s = await fetchDealRegistryState(DEAL_REGISTRY_APP_ID);
      setState(s);
      setLastUpdate(new Date());
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  return (
    <div className="rounded-2xl border border-algo-border bg-algo-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-bold text-white tracking-wide">
            DealRegistry
          </h2>
          <p className="text-xs text-algo-muted font-display mt-0.5">
            App ID: {DEAL_REGISTRY_APP_ID || "not set"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-algo-accent opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-algo-accent" />
          </span>
          <span className="text-xs font-display text-algo-muted">Live</span>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <p className="text-xs font-display text-red-400/80 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          {error}
        </p>
      ) : !state ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-4 rounded bg-algo-border animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      ) : (
        <div>
          <StatRow
            label="Total Deals"
            value={String(state["dealCount"] ?? 0)}
            highlight
          />
          <StatRow
            label="Last Buyer"
            value={truncate(state["lastDealBuyer"] ?? "—")}
          />
          <StatRow
            label="Last Seller"
            value={truncate(state["lastDealSeller"] ?? "—")}
          />
          <StatRow
            label="Asset ID"
            value={String(state["lastDealAssetId"] ?? "—")}
          />
          <StatRow
            label="ALGO Amount"
            value={
              state["lastDealAlgoAmt"]
                ? `${(Number(state["lastDealAlgoAmt"]) / 1e6).toFixed(4)} ALGO`
                : "—"
            }
          />
          <StatRow
            label="Agent Fee"
            value={
              state["lastDealFeeAmt"]
                ? `${(Number(state["lastDealFeeAmt"]) / 1e6).toFixed(4)} ALGO`
                : "—"
            }
            highlight
          />
          <StatRow
            label="Confirmed Round"
            value={String(state["lastDealRound"] ?? "—")}
          />
        </div>
      )}

      {lastUpdate && (
        <p className="text-right text-[10px] font-display text-algo-muted/60">
          Updated {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
