/**
 * types/index.ts
 * Shared TypeScript types for the OTC Trustless Swap frontend.
 */

// ─── Deal Parameters ──────────────────────────────────────────────────────────

/**
 * All parameters required to construct the atomic settlement group.
 */
export interface DealParams {
  /** Alice's Algorand address (the buyer — pays ALGO, receives ASA). */
  buyerAddress: string;
  /** Bob's Algorand address (the seller — receives ALGO, sends ASA). */
  sellerAddress: string;
  /** The Algorand Standard Asset ID being traded. */
  assetId: number;
  /**
   * The amount of ALGO Alice pays Bob, expressed in whole ALGO.
   * The utility function converts this to microALGO internally.
   */
  algoAmount: number;
  /** Charlie's Algorand address (the automated agent / broker). */
  agentAddress: string;
  /** The App ID of the deployed DealRegistry smart contract. */
  dealRegistryAppId: number;
}

// ─── Settlement Result ────────────────────────────────────────────────────────

/**
 * Result returned after the atomic group is signed and submitted.
 */
export interface SettlementResult {
  /** True when all transactions confirmed on-chain. */
  success: boolean;
  /** Transaction ID of the AppCall (last txn in the group). */
  appCallTxId?: string;
  /** Confirmed round for the group. */
  confirmedRound?: number;
  /** Human-readable error message if settlement failed. */
  error?: string;
}

// ─── Wallet State ─────────────────────────────────────────────────────────────

/**
 * Minimal wallet context exposed to UI components.
 */
export interface WalletState {
  isConnected: boolean;
  activeAddress: string | null;
  activeWalletId: string | null;
}

// ─── Deal Log Entry ───────────────────────────────────────────────────────────

/**
 * On-chain deal data read from DealRegistry global state.
 */
export interface DealLogEntry {
  dealCount: number;
  buyer: string;
  seller: string;
  assetId: number;
  assetAmount: number;
  algoAmount: number;
  feeAmount: number;
  round: number;
}
