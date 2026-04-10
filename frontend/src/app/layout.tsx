/**
 * app/layout.tsx
 *
 * Root Next.js App Router layout.
 * Wraps the entire app with the @txnlab/use-wallet WalletProvider
 * so every client component can call `useWallet()`.
 */

import type { Metadata } from "next";
import { WalletProvider } from "@txnlab/use-wallet-react";
import { walletManager } from "@/lib/walletProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "OTC Trustless Swap | Hack.Algo REVA Edition",
  description:
    "Atomic multi-party settlement on Algorand — Future of Finance & Agentic Commerce",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts — Space Mono (display) + DM Sans (body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-algo-dark text-white font-body antialiased min-h-screen">
        {/* WalletProvider must be a Client Component boundary.
            walletManager is instantiated in walletProviders.ts (client module). */}
        <WalletProvider manager={walletManager}>{children}</WalletProvider>
      </body>
    </html>
  );
}
