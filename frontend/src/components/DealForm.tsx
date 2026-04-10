/**
 * components/DealForm.tsx
 *
 * The main deal input form for the OTC Trustless Swap dashboard.
 *
 * Responsibilities:
 * 1. Collect all deal parameters from the user.
 * 2. Pre-fill Buyer Address from the connected wallet.
 * 3. Build the atomic transaction group via buildAtomicSettlementTxns().
 * 4. Request signatures from the connected wallet via signTransactions().
 * 5. Submit the signed group and display the result.
 */

"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  buildAtomicSettlementTxns,
  submitSignedGroup,
} from "@/lib/algorand";
import type { DealParams, SettlementResult } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEAL_REGISTRY_APP_ID = Number(
  process.env.NEXT_PUBLIC_DEAL_REGISTRY_APP_ID ?? 0
);
const DEFAULT_AGENT = process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? "";

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-display text-algo-muted uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  monospace,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  monospace?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-4 py-2.5 rounded-lg
        bg-algo-dark border border-algo-border
        text-sm text-white placeholder-algo-muted/50
        focus:outline-none focus:border-algo-green/60 focus:ring-1 focus:ring-algo-green/20
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors
        ${monospace ? "font-display" : "font-body"}
      `}
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      className="
        w-full px-4 py-2.5 rounded-lg
        bg-algo-dark border border-algo-border
        text-sm text-white placeholder-algo-muted/50 font-display
        focus:outline-none focus:border-algo-green/60 focus:ring-1 focus:ring-algo-green/20
        transition-colors
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
        [&::-webkit-inner-spin-button]:appearance-none
      "
    />
  );
}

// ─── Fee Preview ──────────────────────────────────────────────────────────────

function FeePreview({ algoAmount }: { algoAmount: string }) {
  const amount = parseFloat(algoAmount);
  if (isNaN(amount) || amount <= 0) return null;

  const fee = Math.ceil(amount * 0.05 * 1_000_000) / 1_000_000;
  const total = amount + fee;

  return (
    <div className="rounded-lg border border-algo-border bg-algo-dark/60 p-3 space-y-1.5 text-xs font-display">
      <div className="flex justify-between text-algo-muted">
        <span>Deal Amount</span>
        <span className="text-white">{amount.toFixed(6)} ALGO</span>
      </div>
      <div className="flex justify-between text-algo-muted">
        <span>Agent Fee (5%)</span>
        <span className="text-algo-accent">{fee.toFixed(6)} ALGO</span>
      </div>
      <div className="border-t border-algo-border pt-1.5 flex justify-between">
        <span className="text-algo-muted">Total Cost</span>
        <span className="text-algo-green font-bold">{total.toFixed(6)} ALGO</span>
      </div>
    </div>
  );
}

// ─── Result Banner ────────────────────────────────────────────────────────────

function ResultBanner({ result }: { result: SettlementResult }) {
  if (result.success) {
    return (
      <div className="rounded-lg border border-algo-green/40 bg-algo-green/5 p-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-algo-green text-lg">✓</span>
          <span className="font-display text-algo-green font-bold text-sm">
            Settlement Confirmed On-Chain
          </span>
        </div>
        <div className="space-y-1 text-xs font-display text-algo-muted">
          <div>
            <span>TxID: </span>
            <span className="text-white break-all">{result.appCallTxId}</span>
          </div>
          <div>
            <span>Round: </span>
            <span className="text-algo-green">{result.confirmedRound}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-red-400 text-lg">✗</span>
        <span className="font-display text-red-400 font-bold text-sm">
          Settlement Failed
        </span>
      </div>
      <p className="text-xs font-display text-algo-muted break-all">
        {result.error}
      </p>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function DealForm() {
  const { activeAddress, signTransactions } = useWallet();

  // Form fields
  const [buyerAddress, setBuyerAddress] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [assetId, setAssetId] = useState("");
  const [asaAmount, setAsaAmount] = useState("");
  const [algoAmount, setAlgoAmount] = useState("");
  const [agentAddress, setAgentAddress] = useState(DEFAULT_AGENT);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<SettlementResult | null>(null);

  // Auto-fill buyer address from connected wallet
  useEffect(() => {
    if (activeAddress) setBuyerAddress(activeAddress);
  }, [activeAddress]);

  // ── Settlement handler ─────────────────────────────────────────────────────

  async function handleExecute() {
    setResult(null);
    setStatus("");

    // Validate
    if (!activeAddress) {
      setStatus("❌ Connect your wallet first.");
      return;
    }
    if (!sellerAddress || !assetId || !asaAmount || !algoAmount || !agentAddress) {
      setStatus("❌ Fill in all fields before executing.");
      return;
    }
    if (DEAL_REGISTRY_APP_ID === 0) {
      setStatus("❌ Set NEXT_PUBLIC_DEAL_REGISTRY_APP_ID in .env.local");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Build the atomic group
      setStatus("⏳ Building atomic transaction group…");
      const params: DealParams & { asaAmount: number } = {
        buyerAddress,
        sellerAddress,
        assetId: parseInt(assetId),
        asaAmount: parseInt(asaAmount),
        algoAmount: parseFloat(algoAmount),
        agentAddress,
        dealRegistryAppId: DEAL_REGISTRY_APP_ID,
      };

      const txns = await buildAtomicSettlementTxns(params);

      // 2. Encode for use-wallet
      const encodedTxns = txns.map((t) =>
        t.toByte()
      );

      // 3. Sign — the wallet only signs txns belonging to `activeAddress`.
      //    Txns from Bob (the ASA transfer) must be signed separately.
      setStatus("⏳ Requesting wallet signatures…");
      const signedBlobs = await signTransactions(encodedTxns);

      // 4. Submit
      setStatus("⏳ Submitting group to LocalNet…");
      const settlementResult = await submitSignedGroup(
        signedBlobs.filter(Boolean) as Uint8Array[]
      );

      setResult(settlementResult);
      setStatus("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ success: false, error: msg });
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Row 1: Buyer / Seller */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Buyer Address (Alice)</FieldLabel>
          <TextInput
            value={buyerAddress}
            onChange={setBuyerAddress}
            placeholder="ALICE…"
            disabled={!!activeAddress}
            monospace
          />
          {activeAddress && (
            <p className="text-xs text-algo-muted mt-1 font-display">
              Auto-filled from connected wallet
            </p>
          )}
        </div>
        <div>
          <FieldLabel>Seller Address (Bob)</FieldLabel>
          <TextInput
            value={sellerAddress}
            onChange={setSellerAddress}
            placeholder="BOB…"
            monospace
          />
        </div>
      </div>

      {/* Row 2: Asset ID / ASA Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Asset ID</FieldLabel>
          <NumberInput
            value={assetId}
            onChange={setAssetId}
            placeholder="e.g. 12345"
            min={1}
            step={1}
          />
        </div>
        <div>
          <FieldLabel>ASA Units (to receive)</FieldLabel>
          <NumberInput
            value={asaAmount}
            onChange={setAsaAmount}
            placeholder="e.g. 100"
            min={1}
            step={1}
          />
        </div>
      </div>

      {/* Row 3: ALGO Amount */}
      <div>
        <FieldLabel>ALGO Payment (Alice → Bob)</FieldLabel>
        <NumberInput
          value={algoAmount}
          onChange={setAlgoAmount}
          placeholder="e.g. 10.0"
          min={0.001}
          step={0.001}
        />
      </div>

      {/* Fee preview */}
      {algoAmount && <FeePreview algoAmount={algoAmount} />}

      {/* Row 4: Agent Address */}
      <div>
        <FieldLabel>Agent Address (Charlie — 5% fee receiver)</FieldLabel>
        <TextInput
          value={agentAddress}
          onChange={setAgentAddress}
          placeholder="CHARLIE…"
          monospace
        />
      </div>

      {/* Divider */}
      <div className="border-t border-algo-border" />

      {/* Status message */}
      {status && (
        <p className="text-sm font-display text-algo-accent animate-pulse">
          {status}
        </p>
      )}

      {/* Result */}
      {result && <ResultBanner result={result} />}

      {/* Submit */}
      <button
        onClick={handleExecute}
        disabled={!activeAddress || isLoading}
        className="
          w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-widest uppercase
          bg-algo-green text-algo-dark
          hover:brightness-110 active:scale-[0.99]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200
          shadow-lg shadow-algo-green/20
          animate-glow
        "
      >
        {isLoading ? "Processing…" : "⚡ Sign & Execute Atomic Deal"}
      </button>

      {!activeAddress && (
        <p className="text-center text-xs text-algo-muted font-display">
          Connect a wallet above to enable deal execution
        </p>
      )}
    </div>
  );
}
