/**
 * DealRegistry.algo.ts
 *
 * TealScript smart contract for the OTC Trustless Swap.
 * Deployed once to LocalNet; its App ID is stored in the frontend .env.
 *
 * ROLE IN THE ATOMIC GROUP
 * ──────────────────────────────────────────────────────────────────────
 * This contract is ALWAYS the last transaction in the atomic group.
 * It uses Algorand's Group Transaction opcode access (Gtxn) to reach
 * back into the preceding transactions and verify every invariant before
 * writing the deal record to global state.
 *
 * Expected group layout (indices are 0-based):
 *
 *   groupOffset = 0  (no opt-in)  OR  1  (with opt-in)
 *
 *   [groupOffset + 0]  PayTxn        Alice → Bob        (ALGO payment)
 *   [groupOffset + 1]  AxferTxn      Bob → Alice        (ASA transfer)
 *   [groupOffset + 2]  PayTxn        Alice → Charlie    (5% agent fee)
 *   [groupOffset + 3]  AppCallTxn    → DealRegistry     (THIS contract)
 *
 * The frontend passes `groupOffset` as the first argument to `recordDeal`
 * so the contract can correctly index the preceding transactions even when
 * an opt-in is prepended.
 *
 * FEE INVARIANT
 * ──────────────────────────────────────────────────────────────────────
 * agentFee = ceil(algoPayout * 5 / 100)
 * The contract enforces this with integer arithmetic to avoid floating point.
 *
 * STORAGE LAYOUT  (Global State, 64-byte string key)
 * ──────────────────────────────────────────────────────────────────────
 * "dealCount"           uint64   — monotonically increasing deal counter
 * "lastDealBuyer"       bytes    — Algorand address of Alice
 * "lastDealSeller"      bytes    — Algorand address of Bob
 * "lastDealAssetId"     uint64   — ASA ID transferred
 * "lastDealAssetAmt"    uint64   — ASA units transferred
 * "lastDealAlgoAmt"     uint64   — ALGO (microALGO) paid by Alice → Bob
 * "lastDealFeeAmt"      uint64   — ALGO fee paid to Charlie
 * "lastDealRound"       uint64   — confirmed round at time of call
 */

import { Contract } from "@algorandfoundation/tealscript";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fee numerator: 5 % */
const FEE_NUMERATOR = 5;
/** Fee denominator: 100 % */
const FEE_DENOMINATOR = 100;

// ─── Contract ─────────────────────────────────────────────────────────────────

export class DealRegistry extends Contract {
  // ── Global State ────────────────────────────────────────────────────────────

  /** Total number of deals ever recorded through this registry. */
  dealCount = GlobalStateKey<uint64>({ key: "dealCount" });

  /** Buyer (Alice) address from the most recent deal. */
  lastDealBuyer = GlobalStateKey<Address>({ key: "lastDealBuyer" });

  /** Seller (Bob) address from the most recent deal. */
  lastDealSeller = GlobalStateKey<Address>({ key: "lastDealSeller" });

  /** ASA ID traded in the most recent deal. */
  lastDealAssetId = GlobalStateKey<uint64>({ key: "lastDealAssetId" });

  /** ASA units transferred in the most recent deal. */
  lastDealAssetAmt = GlobalStateKey<uint64>({ key: "lastDealAssetAmt" });

  /** microALGO paid by Alice to Bob in the most recent deal. */
  lastDealAlgoAmt = GlobalStateKey<uint64>({ key: "lastDealAlgoAmt" });

  /** microALGO fee paid by Alice to Charlie in the most recent deal. */
  lastDealFeeAmt = GlobalStateKey<uint64>({ key: "lastDealFeeAmt" });

  /** Confirmed round when the most recent deal was recorded. */
  lastDealRound = GlobalStateKey<uint64>({ key: "lastDealRound" });

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * createApplication
   * Called once during deployment. Initialises the deal counter to zero.
   */
  createApplication(): void {
    this.dealCount.value = 0;
  }

  // ── Public Methods ───────────────────────────────────────────────────────────

  /**
   * recordDeal
   *
   * Verifies the atomic group then writes an immutable deal record.
   *
   * @param groupOffset - 0 if no opt-in prepended, 1 if an opt-in was prepended.
   *                      Determines which group indices to inspect.
   * @param agentAddress - Charlie's address. Verified against the fee PayTxn receiver.
   * @param assetId      - Expected ASA ID. Verified against the AxferTxn xfer asset.
   */
  recordDeal(
    groupOffset: uint64,
    agentAddress: Address,
    assetId: AssetID
  ): void {
    // ── Derive absolute group indices ──────────────────────────────────────────
    //
    // The AppCall itself is always the LAST transaction in the group.
    // We use `this.txn.groupIndex` (the index of THIS transaction) to
    // compute where the preceding transactions sit, regardless of opt-in.
    //
    //   algoPayIdx  = groupOffset + 0
    //   axferIdx    = groupOffset + 1
    //   feePayIdx   = groupOffset + 2
    //   appCallIdx  = groupOffset + 3  (== this.txn.groupIndex, sanity check)

    const algoPayIdx = groupOffset;
    const axferIdx = groupOffset + 1;
    const feePayIdx = groupOffset + 2;

    // Sanity: the AppCall must be the transaction right after feePayIdx.
    assert(
      this.txn.groupIndex === feePayIdx + 1,
      "App call must be the 4th business txn in the group"
    );

    // ── Verify the ALGO Payment  (Alice → Bob) ────────────────────────────────

    const algoPay = this.txnGroup[algoPayIdx];

    // Must be a plain payment (not an app call, asset transfer, etc.)
    assert(algoPay.typeEnum === TransactionType.Payment, "Txn[algoPayIdx] must be PayTxn");

    // The amount must be positive — no zero-value deals.
    assert(algoPay.amount > 0, "ALGO payment amount must be > 0");

    // Capture the parties for the deal record.
    const buyer = algoPay.sender;   // Alice
    const seller = algoPay.receiver; // Bob
    const algoPayout = algoPay.amount; // microALGO

    // ── Verify the ASA Transfer  (Bob → Alice) ────────────────────────────────

    const axfer = this.txnGroup[axferIdx];

    assert(
      axfer.typeEnum === TransactionType.AssetTransfer,
      "Txn[axferIdx] must be AssetTransferTxn"
    );

    // The transferred asset must match the declared asset ID.
    assert(axfer.xferAsset === assetId, "Transferred asset ID mismatch");

    // The ASA must flow from Bob to Alice.
    assert(axfer.sender === seller, "ASA sender must be Bob (seller)");
    assert(axfer.assetReceiver === buyer, "ASA receiver must be Alice (buyer)");

    // The transferred amount must be positive.
    assert(axfer.assetAmount > 0, "ASA transfer amount must be > 0");

    const assetAmount = axfer.assetAmount;

    // ── Verify the Agent Fee Payment  (Alice → Charlie) ───────────────────────

    const feePay = this.txnGroup[feePayIdx];

    assert(feePay.typeEnum === TransactionType.Payment, "Txn[feePayIdx] must be PayTxn");

    // Fee must be paid by the buyer.
    assert(feePay.sender === buyer, "Fee sender must be Alice (buyer)");

    // Fee must be received by Charlie (the declared agent).
    assert(feePay.receiver === agentAddress, "Fee receiver must be the declared agent");

    // Enforce the 5 % fee invariant using integer ceiling arithmetic:
    //   requiredFee = ceil(algoPayout * 5 / 100)
    //               = (algoPayout * 5 + 99) / 100   (integer division)
    const requiredFee = (algoPayout * FEE_NUMERATOR + (FEE_DENOMINATOR - 1)) / FEE_DENOMINATOR;
    assert(feePay.amount >= requiredFee, "Agent fee is below required 5%");

    const feeAmount = feePay.amount;

    // ── All checks passed — write the deal record ─────────────────────────────

    this.dealCount.value = this.dealCount.value + 1;

    this.lastDealBuyer.value = buyer;
    this.lastDealSeller.value = seller;
    this.lastDealAssetId.value = assetId.id;
    this.lastDealAssetAmt.value = assetAmount;
    this.lastDealAlgoAmt.value = algoPayout;
    this.lastDealFeeAmt.value = feeAmount;
    this.lastDealRound.value = globals.round;

    // Emit a structured log entry so indexers can parse deal history.
    log(
      concat(
        "DEAL #",
        itob(this.dealCount.value)
      )
    );
  }

  /**
   * getDealCount
   * Read-only helper — returns the total number of deals ever recorded.
   */
  getDealCount(): uint64 {
    return this.dealCount.value;
  }
}
