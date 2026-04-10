"use client";

import { useState, useEffect } from "react";
import algosdk from "algosdk";
import {
  buildAtomicSettlementTxns,
  submitSignedGroup,
} from "@/lib/algorand";
import type { DealParams, SettlementResult } from "@/types";

// ─── CONFIG ────────────────────────────────────────────────────────────────

const ALGOD = new algosdk.Algodv2(
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "http://localhost",
  4001
);

const KMD = new algosdk.Kmd(
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "http://localhost",
  4002
);

const DEAL_REGISTRY_APP_ID = Number(
  process.env.NEXT_PUBLIC_DEAL_REGISTRY_APP_ID ?? 0
);
const DEFAULT_AGENT = process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? "";

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function DealForm() {
  const [account, setAccount] = useState<string>("");

  const [sellerAddress, setSellerAddress] = useState("");
  const [assetId, setAssetId] = useState("");
  const [asaAmount, setAsaAmount] = useState("");
  const [algoAmount, setAlgoAmount] = useState("");
  const [agentAddress, setAgentAddress] = useState(DEFAULT_AGENT);

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SettlementResult | null>(null);

  // ── Load LocalNet account ───────────────────────────────────────────────

  useEffect(() => {
    async function loadAccount() {
      try {
        const wallets = await KMD.listWallets();
        const walletId = wallets.wallets[0].id;
        const handle = await KMD.initWalletHandle(walletId, "");
        const keys = await KMD.listKeys(handle.wallet_handle_token);
        setAccount(keys.addresses[0]);
        await KMD.releaseWalletHandle(handle.wallet_handle_token);
      } catch (e) {
        console.error("KMD load failed:", e);
      }
    }
    loadAccount();
  }, []);

  // ── SIGN TRANSACTIONS (KMD) ─────────────────────────────────────────────

  async function signTxns(txns: algosdk.Transaction[]) {
    const wallets = await KMD.listWallets();
    const walletId = wallets.wallets[0].id;
    const handle = await KMD.initWalletHandle(walletId, "");
    const signed: Uint8Array[] = [];
    for (const txn of txns) {
      const blob = await KMD.signTransaction(
        handle.wallet_handle_token,
        "",
        txn
      );
      signed.push(blob.signed_transaction);
    }
    await KMD.releaseWalletHandle(handle.wallet_handle_token);
    return signed;
  }

  // ── EXECUTE DEAL ────────────────────────────────────────────────────────

  async function handleExecute() {
    setResult(null);
    setStatus("");

    if (!account) {
      setStatus("❌ Wallet not ready");
      return;
    }
    if (!sellerAddress || !assetId || !asaAmount || !algoAmount) {
      setStatus("❌ Fill all fields");
      return;
    }

    const parsedAssetId = parseInt(assetId);
    if (isNaN(parsedAssetId) || parsedAssetId <= 0) {
      setStatus("❌ Asset ID must be a positive integer");
      return;
    }

    setIsLoading(true);

    try {
      setStatus("⏳ Building transaction group...");

      const params: DealParams & { asaAmount: number } = {
        buyerAddress: account,
        sellerAddress,
        assetId: parsedAssetId,
        asaAmount: parseInt(asaAmount),
        algoAmount: parseFloat(algoAmount),
        agentAddress,
        dealRegistryAppId: DEAL_REGISTRY_APP_ID,
      };

      const txns = await buildAtomicSettlementTxns(params);

      setStatus("⏳ Signing via KMD...");
      const signed = await signTxns(txns);

      setStatus("⏳ Submitting...");
      const res = await submitSignedGroup(signed);

      setResult(res);
      setStatus("");
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  // ── INPUT STYLE ─────────────────────────────────────────────────────────

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-algo-border bg-algo-dark text-white placeholder-algo-muted focus:outline-none focus:border-algo-green focus:ring-1 focus:ring-algo-green transition-colors font-display text-sm";

  const labelClass =
    "block text-xs font-display text-algo-muted uppercase tracking-widest mb-1";

  // ── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Wallet badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-algo-dark border border-algo-border">
        <span className="w-2 h-2 rounded-full bg-algo-green animate-pulse-slow" />
        <span className="font-display text-xs text-algo-muted">Wallet:</span>
        <span className="font-display text-xs text-algo-green truncate">
          {account ? account : "Connecting…"}
        </span>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={labelClass}>Seller Address (Bob)</label>
          <input
            className={inputClass}
            placeholder="ALGO address of the seller"
            value={sellerAddress}
            onChange={(e) => setSellerAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Asset ID</label>
            <input
              className={inputClass}
              type="number"
              placeholder="e.g. 123456"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>ASA Amount</label>
            <input
              className={inputClass}
              type="number"
              placeholder="Units to receive"
              value={asaAmount}
              onChange={(e) => setAsaAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>ALGO Amount</label>
            <input
              className={inputClass}
              type="number"
              step="0.001"
              placeholder="e.g. 10.5"
              value={algoAmount}
              onChange={(e) => setAlgoAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Agent Address (Charlie)</label>
            <input
              className={inputClass}
              placeholder="Agent's ALGO address"
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleExecute}
        disabled={isLoading}
        className="w-full py-3 px-6 rounded-xl font-display text-sm font-bold tracking-wide transition-all
          bg-algo-green text-algo-dark hover:bg-algo-green/90 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
          shadow-lg shadow-algo-green/20"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing…
          </span>
        ) : (
          "Execute Atomic Swap"
        )}
      </button>

      {/* Status message */}
      {status && (
        <p className="font-display text-xs text-algo-muted px-1">{status}</p>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.success
              ? "border-algo-green/30 bg-algo-green/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <p className="font-display text-sm font-bold mb-2 text-white">
            {result.success ? "✅ Success" : "❌ Failed"}
          </p>
          <pre className="font-display text-xs text-algo-muted overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
