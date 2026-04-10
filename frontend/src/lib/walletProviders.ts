/**
 * lib/walletProviders.ts
 *
 * Configures the @txnlab/use-wallet provider list for the OTC Swap app.
 *
 * Supported wallets on LocalNet:
 *  - KMD (built-in AlgoKit LocalNet wallet — always available)
 *  - Pera Wallet (mobile, requires Pera app)
 *  - Defly Wallet (mobile, requires Defly app)
 *  - Lute Wallet (browser extension)
 *
 * The WalletManager is instantiated once and exported as a singleton.
 * It is passed to <WalletProvider> in the root layout.
 */

import {
  WalletManager,
  WalletId,
  NetworkId,
} from "@txnlab/use-wallet-react";

const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER ?? "http://localhost";
const ALGOD_PORT = Number(process.env.NEXT_PUBLIC_ALGOD_PORT ?? 4001);
const ALGOD_TOKEN =
  process.env.NEXT_PUBLIC_ALGOD_TOKEN ??
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export const walletManager = new WalletManager({
  wallets: [
    // ── KMD — LocalNet dev wallet ──────────────────────────────────────────
    {
      id: WalletId.KMD,
      options: {
        host: ALGOD_SERVER,
        port: 4002,                     // KMD default port
        token: ALGOD_TOKEN,
        wallet: "unencrypted-default-wallet",
        password: "",
      },
    },
    // ── Pera Wallet ───────────────────────────────────────────────────────
    {
      id: WalletId.PERA,
    },
    // ── Defly Wallet ──────────────────────────────────────────────────────
    {
      id: WalletId.DEFLY,
    },
    // ── Lute Wallet (browser extension) ───────────────────────────────────
    {
      id: WalletId.LUTE,
      options: { siteName: "OTC Trustless Swap" },
    },
  ],
  network: NetworkId.LOCALNET,
  algod: {
    baseServer: ALGOD_SERVER,
    port: ALGOD_PORT,
    token: ALGOD_TOKEN,
  },
});
