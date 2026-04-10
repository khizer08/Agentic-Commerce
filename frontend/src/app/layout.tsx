import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OTC Trustless Swap",
  description: "Atomic swaps on Algorand",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}