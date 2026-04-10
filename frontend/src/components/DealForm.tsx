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
      const wallets = await KMD.listWallets();
      const walletId = wallets.wallets[0].id;

      const handle = await KMD.initWalletHandle(walletId, "");
      const keys = await KMD.listKeys(handle.wallet_handle_token);

      setAccount(keys.addresses[0]);

      await KMD.releaseWalletHandle(handle.wallet_handle_token);
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

    setIsLoading(true);

    try {
      setStatus("⏳ Building transaction group...");

      const params: DealParams & { asaAmount: number } = {
        buyerAddress: account,
        sellerAddress,
        assetId: parseInt(assetId),
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
      setResult({
        success: false,
        error: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div>Wallet: {account ? account.slice(0, 10) + "..." : "Loading..."}</div>

      <input
        placeholder="Seller Address"
        value={sellerAddress}
        onChange={(e) => setSellerAddress(e.target.value)}
      />

      <input
        placeholder="Asset ID"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
      />

      <input
        placeholder="ASA Amount"
        value={asaAmount}
        onChange={(e) => setAsaAmount(e.target.value)}
      />

      <input
        placeholder="ALGO Amount"
        value={algoAmount}
        onChange={(e) => setAlgoAmount(e.target.value)}
      />

      <button onClick={handleExecute} disabled={isLoading}>
        {isLoading ? "Processing..." : "Execute Swap"}
      </button>

      {status && <p>{status}</p>}

      {result && (
        <div>
          {result.success ? "✅ Success" : "❌ Failed"}
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}