/**
 * components/WalletConnect.tsx
 *
 * Reusable wallet connection widget powered by @txnlab/use-wallet.
 *
 * Features:
 * - Lists all configured providers (KMD, Pera, Defly, Lute).
 * - Shows active wallet address with copy-to-clipboard.
 * - Disconnect button.
 * - Minimal, dark-themed UI consistent with the dashboard aesthetic.
 */

"use client";

import { useState } from "react";
import { useWallet, type Wallet } from "@txnlab/use-wallet-react";

// ─── Wallet logo map (SVG data URIs / emoji fallbacks) ────────────────────────

const WALLET_ICONS: Record<string, string> = {
  kmd: "🔑",
  pera: "🟢",
  defly: "🔵",
  lute: "🎵",
};

// ─── Address truncation helper ────────────────────────────────────────────────

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WalletConnectProps {
  /** Optional className for the root container. */
  className?: string;
}

export default function WalletConnect({ className = "" }: WalletConnectProps) {
  const { wallets, activeAddress, activeWallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleConnect(wallet: Wallet) {
    setConnecting(wallet.id);
    try {
      await wallet.connect();
    } catch (err) {
      console.error("Wallet connect error:", err);
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect() {
    if (activeWallet) {
      await activeWallet.disconnect();
    }
  }

  function handleCopy() {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  // ── Connected view ────────────────────────────────────────────────────────

  if (activeAddress) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Indicator dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-algo-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-algo-green" />
        </span>

        {/* Address pill */}
        <button
          onClick={handleCopy}
          title={activeAddress}
          className="
            flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-algo-panel border border-algo-border
            text-xs font-display text-algo-green
            hover:border-algo-green/50 transition-colors
          "
        >
          {WALLET_ICONS[activeWallet?.id ?? "kmd"] ?? "💼"}
          <span>{truncate(activeAddress)}</span>
          <span className="text-algo-muted ml-1">
            {copied ? "✓" : "⎘"}
          </span>
        </button>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="
            px-3 py-1.5 rounded-full text-xs font-display
            border border-algo-border text-algo-muted
            hover:border-red-500/50 hover:text-red-400 transition-colors
          "
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ── Disconnected view — wallet picker ─────────────────────────────────────

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {wallets.map((wallet) => (
        <button
          key={wallet.id}
          onClick={() => handleConnect(wallet)}
          disabled={connecting === wallet.id}
          className="
            flex items-center gap-2 px-4 py-2 rounded-full
            border border-algo-border bg-algo-panel
            text-sm font-display text-white
            hover:border-algo-green/60 hover:bg-algo-green/5
            disabled:opacity-50 disabled:cursor-wait
            transition-all duration-200
          "
        >
          <span>{WALLET_ICONS[wallet.id] ?? "💼"}</span>
          <span>
            {connecting === wallet.id
              ? "Connecting…"
              : wallet.metadata.name}
          </span>
        </button>
      ))}
    </div>
  );
}
