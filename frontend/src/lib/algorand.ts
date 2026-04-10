/**
 * lib/algorand.ts — OTC Trustless Swap
 */

import algosdk from "algosdk";
import type { DealParams, SettlementResult } from "@/types";

// ─── Algod Client ─────────────────────────────────────────────────────────────

const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER ?? "http://localhost";
const ALGOD_PORT   = Number(process.env.NEXT_PUBLIC_ALGOD_PORT ?? 4001);
const ALGOD_TOKEN  =
  process.env.NEXT_PUBLIC_ALGOD_TOKEN ??
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export function getAlgodClient(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_FEE = algosdk.ALGORAND_MIN_TX_FEE;

function toMicroAlgo(algo: number): number {
  return Math.round(algo * 1_000_000);
}

function calcAgentFee(microAlgo: number): number {
  return Math.ceil(microAlgo * 0.05);
}

/** Safe uint64 → 8-byte big-endian Uint8Array (avoids BigInt runtime issues) */
function uint64ToBytes(value: number): Uint8Array {
  const buf = new Uint8Array(8);
  const hi = Math.floor(value / 0x100000000);
  const lo = value >>> 0;
  buf[0] = (hi >>> 24) & 0xff;
  buf[1] = (hi >>> 16) & 0xff;
  buf[2] = (hi >>>  8) & 0xff;
  buf[3] =  hi         & 0xff;
  buf[4] = (lo >>> 24) & 0xff;
  buf[5] = (lo >>> 16) & 0xff;
  buf[6] = (lo >>>  8) & 0xff;
  buf[7] =  lo         & 0xff;
  return buf;
}

async function isOptedIn(
  algod: algosdk.Algodv2,
  address: string,
  assetId: number,
): Promise<boolean> {
  try {
    const info = await algod.accountInformation(address).do();
    return (info.assets ?? []).some(
      (a: { "asset-id": number }) => a["asset-id"] === assetId,
    );
  } catch {
    return false;
  }
}

// ─── Build Atomic Group ───────────────────────────────────────────────────────

export async function buildAtomicSettlementTxns(
  params: DealParams,
): Promise<algosdk.Transaction[]> {
  const { buyerAddress, sellerAddress, assetId, algoAmount, agentAddress, dealRegistryAppId } = params;

  // Validation
  if (!algosdk.isValidAddress(buyerAddress))  throw new Error(`Invalid buyer address: ${buyerAddress}`);
  if (!algosdk.isValidAddress(sellerAddress)) throw new Error(`Invalid seller address: ${sellerAddress}`);
  if (!algosdk.isValidAddress(agentAddress))  throw new Error(`Invalid agent address: ${agentAddress}`);
  if (!Number.isInteger(assetId) || assetId <= 0) throw new Error(`Invalid asset ID: ${assetId}`);
  if (algoAmount <= 0) throw new Error(`ALGO amount must be positive`);
  if (dealRegistryAppId <= 0) throw new Error(`Invalid App ID: ${dealRegistryAppId}`);

  const algod = getAlgodClient();
  const sp = await algod.getTransactionParams().do();
  sp.fee = MIN_FEE;
  sp.flatFee = true;

  const microAlgoPayout  = toMicroAlgo(algoAmount);
  const agentFeeMicro    = calcAgentFee(microAlgoPayout);
  const aliceOptedIn     = await isOptedIn(algod, buyerAddress, assetId);
  const asaAmount        = (params as DealParams & { asaAmount?: number }).asaAmount ?? 1;
  const groupOffset      = aliceOptedIn ? 0 : 1;

  const txns: algosdk.Transaction[] = [];

  // [0?] Opt-In
  if (!aliceOptedIn) {
    txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: buyerAddress, to: buyerAddress,
      assetIndex: assetId, amount: 0,
      suggestedParams: sp,
      note: new Uint8Array(Buffer.from("OTC: Opt-In")),
    }));
  }

  // ALGO pay Alice → Bob
  txns.push(algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: buyerAddress, to: sellerAddress,
    amount: microAlgoPayout,
    suggestedParams: sp,
    note: new Uint8Array(Buffer.from("OTC: ALGO pay")),
  }));

  // ASA transfer Bob → Alice
  txns.push(algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sellerAddress, to: buyerAddress,
    assetIndex: assetId, amount: asaAmount,
    suggestedParams: sp,
    note: new Uint8Array(Buffer.from("OTC: ASA transfer")),
  }));

  // Fee pay Alice → Charlie
  txns.push(algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: buyerAddress, to: agentAddress,
    amount: agentFeeMicro,
    suggestedParams: sp,
    note: new Uint8Array(Buffer.from("OTC: Agent fee")),
  }));

  // App call → DealRegistry.recordDeal(uint64,address,uint64)void
  //
  // ALL appArgs elements must be Uint8Array — we build each explicitly:
  //   arg0: 4-byte ABI method selector
  //   arg1: groupOffset as uint64 (8 bytes)
  //   arg2: agentAddress public key (32 bytes)
  //   arg3: assetId as uint64 (8 bytes)

  const abiMethod = new algosdk.ABIMethod({
    name: "recordDeal",
    args: [
      { name: "groupOffset",  type: "uint64"  },
      { name: "agentAddress", type: "address" },
      { name: "assetId",      type: "uint64"  },
    ],
    returns: { type: "void" },
  });

  // getSelector() may return Buffer; wrap in Uint8Array to be safe
  const selector      = new Uint8Array(abiMethod.getSelector());
  const offsetBytes   = uint64ToBytes(groupOffset);
  const agentPubKey   = new Uint8Array(algosdk.decodeAddress(agentAddress).publicKey);
  const assetIdBytes  = uint64ToBytes(assetId);

  // Sanity-check — each must be a true Uint8Array
  const args: Uint8Array[] = [selector, offsetBytes, agentPubKey, assetIdBytes];
  for (const a of args) {
    if (!(a instanceof Uint8Array)) throw new Error("appArg is not Uint8Array: " + a);
  }

  txns.push(algosdk.makeApplicationCallTxnFromObject({
    from: buyerAddress,
    appIndex: dealRegistryAppId,
    onCompletion: algosdk.OnApplicationComplete.NoOpOC,
    appArgs: args,
    foreignAssets: [assetId],
    suggestedParams: sp,
    note: new Uint8Array(Buffer.from("OTC: DealRegistry.recordDeal")),
  }));

  algosdk.assignGroupID(txns);
  return txns;
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitSignedGroup(
  signedTxns: Uint8Array[],
): Promise<SettlementResult> {
  const algod = getAlgodClient();
  try {
    const { txId } = await algod.sendRawTransaction(signedTxns).do();
    const confirmation = await algosdk.waitForConfirmation(algod, txId, 10);
    return {
      success: true,
      appCallTxId: txId,
      confirmedRound: Number(confirmation["confirmed-round"]),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Read Registry State ──────────────────────────────────────────────────────

export async function fetchDealRegistryState(appId: number) {
  const algod = getAlgodClient();
  const app   = await algod.getApplicationByID(appId).do();
  const state: Record<string, string | number> = {};

  for (const kv of app.params["global-state"] ?? []) {
    const key = Buffer.from(kv.key, "base64").toString("utf8");
    const val = kv.value;
    if (val.type === 1) {
      const bytes = Buffer.from(val.bytes, "base64");
      state[key] = bytes.length === 32
        ? algosdk.encodeAddress(new Uint8Array(bytes))
        : bytes.toString("utf8");
    } else {
      state[key] = val.uint;
    }
  }
  return state;
}
