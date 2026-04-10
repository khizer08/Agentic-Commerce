"use client";

import { useEffect, useState } from "react";
import algosdk from "algosdk";

export default function WalletConnect() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccount() {
      const kmd = new algosdk.Kmd(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "http://localhost",
        4002
      );

      const wallets = await kmd.listWallets();
      const walletId = wallets.wallets[0].id;

      const handle = await kmd.initWalletHandle(walletId, "");
      const keys = await kmd.listKeys(handle.wallet_handle_token);

      setAccount(keys.addresses[0]);

      await kmd.releaseWalletHandle(handle.wallet_handle_token);
    }

    loadAccount();
  }, []);

  if (!account) return <div>Connecting wallet...</div>;

  return (
    <div className="p-3 border rounded">
      Connected: {account.slice(0, 6)}...{account.slice(-4)}
    </div>
  );
}