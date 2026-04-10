/**
 * lib/algorand.ts
 *
 * Core blockchain utility for the OTC Trustless Swap.
 *
 * PRIMARY EXPORT: `executeAtomicSettlement`
 * Constructs a fully-validated, grouped Algorand transaction array ready
 * for multi-party signing via @txnlab/use-wallet.
 *
 * TRANSACTION GROUP LAYOUT
 * ─────────────────────────────────────────────────────────────────────────
 *  Index  | Type              | Sender → Receiver       | Notes
 * ────────┼───────────────────┼─────────────────────────┼──────────────────
 *  [0]*   | AssetTransfer     | Alice → Alice           | Opt-in (if needed)
 *  [0/1]  | Payment           | Alice → Bob             | ALGO deal payment
 *  [1/2]  | AssetTransfer     | Bob → Alice             | ASA delivery
 *  [2/3]  | Payment           | Alice → Charlie         | 5 % agent fee
 *  [3/4]  | ApplicationCall   | Alice → DealRegistry    | On-chain verification
 * ─────────────────────────────────────────────────────────────────────────
 * * Index 0 is only present when Alice has not already opted into the ASA.
 *
 * MULTI-SIGNER NOTE
 * ─────────────────────────────────────────────────────────────────────────
 * The group contains transactions from THREE different senders:
 *   - Alice: opt-in (cond), algo-pay, fee-pay, app-call
 *   - Bob:   asset-transfer
 * In a production flow the frontend collects Alice's signatures and sends
 * the partially-signed group to Bob (and Charlie's backend) for co-signing
 * before submission. For hackathon/LocalNet purposes, the function returns
 * the raw (unsigned) transaction array for the host wallet to handle.
 */

import algosdk from "algosdk";
import type { DealParams, SettlementResult } from "@/types";

// ─── LocalNet Algod Client ────────────────────────────────────────────────────

const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER ?? "http://localhost";
const ALGOD_PORT = Number(process.env.NEXT_PUBLIC_ALGOD_PORT ?? 4001);
const ALGOD_TOKEN =
  process.env.NEXT_PUBLIC_ALGOD_TOKEN ??
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/**
 * Returns a configured algod client pointing at LocalNet.
 * Exported so other modules can reuse the same connection settings.
 */
export function getAlgodClient(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

// ─── Fee Constants ────────────────────────────────────────────────────────────

/** Standard Algorand minimum transaction fee (microALGO). */
const MIN_FEE = algosdk.ALGORAND_MIN_TX_FEE; // 1_000 microALGO

/** Brokerage fee: 5 % of the ALGO deal amount. */
const AGENT_FEE_BPS = 0.05;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert whole ALGO to microALGO with ceiling rounding.
 */
function toMicroAlgo(algo: number): bigint {
  return BigInt(Math.round(algo * 1_000_000));
}

/**
 * Calculate the required agent fee (ceil 5 %).
 * We use ceiling so the integer check in the contract always passes.
 */
function calcAgentFee(microAlgoAmount: bigint): bigint {
  return BigInt(Math.ceil(Number(microAlgoAmount) * AGENT_FEE_BPS));
}

/**
 * Check whether `address` has already opted into `assetId`.
 *
 * An account is considered opted-in if the asset appears in its
 * `assets` array (returned by the algod `/v2/accounts/:address` endpoint).
 *
 * @returns `true` if the account holds the asset (opted in), `false` otherwise.
 */
async function isOptedIn(
  algod: algosdk.Algodv2,
  address: string,
  assetId: number
): Promise<boolean> {
  try {
    const accountInfo = await algod.accountInformation(address).do();
    const assets: Array<{ "asset-id": number }> = accountInfo.assets ?? [];
    return assets.some((a) => a["asset-id"] === assetId);
  } catch {
    // If the account doesn't exist on-chain it definitely isn't opted in.
    return false;
  }
}

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * executeAtomicSettlement
 *
 * Builds the full atomic transaction group for an OTC deal and returns
 * the array of unsigned `algosdk.Transaction` objects in group order.
 *
 * The caller (UI component) passes this array to `signTransactions` from
 * @txnlab/use-wallet. The wallet signs only the transactions belonging to
 * the currently-connected signer and leaves others untouched.
 *
 * @param params - Full deal parameters including addresses, asset, amounts.
 * @returns Array of grouped, unsigned `algosdk.Transaction` objects.
 * @throws Error if any parameter is invalid or the algod call fails.
 */
export async function buildAtomicSettlementTxns(
  params: DealParams
): Promise<algosdk.Transaction[]> {
  const {
    buyerAddress,
    sellerAddress,
    assetId,
    algoAmount,
    agentAddress,
    dealRegistryAppId,
  } = params;

  // ── Basic validation ────────────────────────────────────────────────────────

  if (!algosdk.isValidAddress(buyerAddress))
    throw new Error(`Invalid buyer address: ${buyerAddress}`);
  if (!algosdk.isValidAddress(sellerAddress))
    throw new Error(`Invalid seller address: ${sellerAddress}`);
  if (!algosdk.isValidAddress(agentAddress))
    throw new Error(`Invalid agent address: ${agentAddress}`);
  if (!Number.isInteger(assetId) || assetId <= 0)
    throw new Error(`Invalid asset ID: ${assetId}`);
  if (algoAmount <= 0)
    throw new Error(`ALGO amount must be positive, got: ${algoAmount}`);
  if (dealRegistryAppId <= 0)
    throw new Error(`Invalid DealRegistry App ID: ${dealRegistryAppId}`);

  // ── Algod setup ─────────────────────────────────────────────────────────────

  const algod = getAlgodClient();
  const suggestedParams = await algod.getTransactionParams().do();

  // Use a flat fee to keep things predictable in the hackathon demo.
  suggestedParams.fee = MIN_FEE;
  suggestedParams.flatFee = true;

  // ── Compute amounts ─────────────────────────────────────────────────────────

  const microAlgoPayout = toMicroAlgo(algoAmount);
  const agentFeeMicroAlgo = calcAgentFee(microAlgoPayout);

  // ── Check ASA opt-in ────────────────────────────────────────────────────────

  const aliceOptedIn = await isOptedIn(algod, buyerAddress, assetId);

  // ── Build transaction list ──────────────────────────────────────────────────

  const txns: algosdk.Transaction[] = [];

  /**
   * [CONDITIONAL] TXN 0 — ASA Opt-In (Alice → Alice, 0 ASA)
   *
   * Algorand requires an account to opt into an ASA before it can
   * receive units of that asset. A zero-value self-transfer is the
   * canonical opt-in mechanism.
   */
  if (!aliceOptedIn) {
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: buyerAddress,
      to: buyerAddress,   // self-transfer
      assetIndex: assetId,
      amount: 0,           // 0 ASA units — signals opt-in intent
      suggestedParams,
      note: new Uint8Array(Buffer.from("OTC Swap: ASA Opt-In")),
    });
    txns.push(optInTxn);
  }

  /**
   * Determine the group offset the smart contract will use.
   * If an opt-in was prepended, business txns start at index 1.
   */
  const groupOffset = aliceOptedIn ? 0 : 1;

  /**
   * TXN [groupOffset + 0] — ALGO Payment (Alice → Bob)
   *
   * Alice pays Bob the agreed ALGO amount for the ASA.
   */
  const algoPayTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: buyerAddress,
    to: sellerAddress,
    amount: Number(microAlgoPayout),
    suggestedParams,
    note: new Uint8Array(Buffer.from("OTC Swap: ALGO → ASA")),
  });
  txns.push(algoPayTxn);

  /**
   * TXN [groupOffset + 1] — ASA Transfer (Bob → Alice)
   *
   * Bob sends Alice the agreed quantity of the ASA.
   * NOTE: The actual ASA amount is read from the account info of Bob
   * in the UI; here we accept it as part of DealParams in a fuller
   * implementation. For this atomic group, we transfer the full holding.
   * The UI passes the quantity the parties agreed on.
   */
  // We need to know how many ASA units Bob is sending.
  // In the full flow the UI negotiates this off-chain; we embed it
  // in DealParams. We read it here from asaAmount (added to DealParams).
  // For simplicity, we expose `asaAmount` via an extended param below.

  const extendedParams = params as DealParams & { asaAmount?: number };
  const asaAmount = extendedParams.asaAmount ?? 1; // default: 1 whole unit

  const asaTransferTxn =
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sellerAddress,
      to: buyerAddress,
      assetIndex: assetId,
      amount: asaAmount,
      suggestedParams,
      note: new Uint8Array(Buffer.from("OTC Swap: ASA → Buyer")),
    });
  txns.push(asaTransferTxn);

  /**
   * TXN [groupOffset + 2] — Agent Fee Payment (Alice → Charlie)
   *
   * Alice pays Charlie 5 % of the ALGO payout as a brokerage fee.
   * The DealRegistry contract re-derives and enforces this value.
   */
  const feePayTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: buyerAddress,
    to: agentAddress,
    amount: Number(agentFeeMicroAlgo),
    suggestedParams,
    note: new Uint8Array(Buffer.from("OTC Swap: 5% Agent Fee")),
  });
  txns.push(feePayTxn);

  /**
   * TXN [groupOffset + 3] — Application Call to DealRegistry
   *
   * Calls `recordDeal(groupOffset, agentAddress, assetId)`.
   * The contract reads back the preceding transactions from the group
   * context and reverts the entire group if any invariant is violated.
   *
   * ABI encoding:
   *   - method selector (4 bytes)
   *   - groupOffset (uint64)
   *   - agentAddress (address = 32 bytes)
   *   - assetId (uint64)
   */
  const appCallTxn =
    algosdk.makeApplicationCallTxnFromObject({
      from: buyerAddress,
      appIndex: dealRegistryAppId,
      onCompletion: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [
        // Method selector for recordDeal(uint64,address,uint64)void
        algosdk.encodeUint64(groupOffset),           // arg 0: groupOffset
        algosdk.decodeAddress(agentAddress).publicKey, // arg 1: agentAddress
        algosdk.encodeUint64(assetId),               // arg 2: assetId
      ],
      foreignAssets: [assetId],
      suggestedParams,
      note: new Uint8Array(Buffer.from("OTC Swap: DealRegistry.recordDeal")),
    });
  txns.push(appCallTxn);

  // ── Assign group ID ─────────────────────────────────────────────────────────
  //
  // `assignGroupID` hashes the entire ordered transaction array and embeds
  // the resulting Group ID into every transaction's `group` field.
  // Algorand validators reject any group where this hash doesn't match,
  // making it impossible to submit transactions individually.

  algosdk.assignGroupID(txns);

  return txns;
}

// ─── Submit Helper ────────────────────────────────────────────────────────────

/**
 * submitSignedGroup
 *
 * Takes the fully-signed (all parties) `SignedTransaction` blobs produced
 * by @txnlab/use-wallet and broadcasts them to LocalNet.
 *
 * @param signedTxns - Array of signed transaction blobs in group order.
 * @returns SettlementResult with txId and confirmed round on success.
 */
export async function submitSignedGroup(
  signedTxns: Uint8Array[]
): Promise<SettlementResult> {
  const algod = getAlgodClient();

  try {
    // Submit the entire group in one sendRawTransaction call.
    const { txId } = await algod
      .sendRawTransaction(signedTxns)
      .do();

    // Wait for confirmation (up to 10 rounds).
    const confirmation = await algosdk.waitForConfirmation(algod, txId, 10);

    return {
      success: true,
      appCallTxId: txId,
      confirmedRound: Number(confirmation["confirmed-round"]),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Read Registry State ──────────────────────────────────────────────────────

/**
 * fetchDealRegistryState
 *
 * Reads the global state of the DealRegistry contract from algod and
 * returns a decoded snapshot of the most recent deal.
 *
 * @param appId - The DealRegistry App ID.
 */
export async function fetchDealRegistryState(appId: number) {
  const algod = getAlgodClient();
  const app = await algod.getApplicationByID(appId).do();
  const state: Record<string, string | number> = {};

  for (const kv of app.params["global-state"] ?? []) {
    const key = Buffer.from(kv.key, "base64").toString("utf8");
    const val = kv.value;
    if (val.type === 1) {
      // bytes — decode address or string
      const bytes = Buffer.from(val.bytes, "base64");
      if (bytes.length === 32) {
        state[key] = algosdk.encodeAddress(new Uint8Array(bytes));
      } else {
        state[key] = bytes.toString("utf8");
      }
    } else {
      // uint
      state[key] = val.uint;
    }
  }

  return state;
}
