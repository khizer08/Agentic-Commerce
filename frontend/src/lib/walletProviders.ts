"use client";

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
    // ── KMD — LocalNet dev wallet (PRIMARY for demo) ───────────────────────
    {
      id: WalletId.KMD,
      options: {
        host: ALGOD_SERVER,
        port: 4002,
        token: ALGOD_TOKEN,
        wallet: "unencrypted-default-wallet",
        password: "",
      },
    },

    // ── Pera Wallet (optional) ─────────────────────────────────────────────
    {
      id: WalletId.PERA,
    },

    // ❌ REMOVED:
    // WalletId.DEFLY
    // WalletId.LUTE
  ],

  network: NetworkId.LOCALNET,

  algod: {
    baseServer: ALGOD_SERVER,
    port: ALGOD_PORT,
    token: ALGOD_TOKEN,
  },
});