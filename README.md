# OTC Trustless Swap — Hack.Algo REVA Edition

> **Theme:** Future of Finance | Agentic Commerce  
> **Problem:** Atomic Multi-Party Settlement  

## Architecture

```
Alice (Buyer) ──┐
                ├──► Atomic Group ──► DealRegistry (TealScript)
Bob (Seller) ───┤         │
                │    [verified on-chain]
Charlie (Agent)─┘
```

## Stack

| Layer | Tech |
|-------|------|
| Smart Contract | TealScript → TEAL |
| Frontend | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS |
| Wallet | @txnlab/use-wallet |
| SDK | algosdk + @algorandfoundation/algokit-utils |
| Environment | AlgoKit LocalNet |

## Quick Start

### 1. Prerequisites

```bash
pip install algokit
algokit localnet start
```

### 2. Smart Contract Setup

```bash
cd contracts
npm install
npm run build        # Compiles TealScript → TEAL + ABI
npm run deploy       # Deploys DealRegistry to LocalNet
```

> Copy the printed **App ID** — you'll need it for the frontend.

### 3. Frontend Setup

```bash
cd frontend
npm install
# Create .env.local (copy from .env.example and paste your App ID)
cp .env.example .env.local
# Edit NEXT_PUBLIC_DEAL_REGISTRY_APP_ID=<your-app-id>
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## AlgoKit Init (for reference)

```bash
algokit init --template-url https://github.com/algorandfoundation/algokit-fullstack-template \
  --name otc-swap \
  --answer project_name otc-swap \
  --answer frontend_framework nextjs \
  --answer contract_language tealscript
```

## Transaction Group Structure

```
[0] ASA Opt-In       — Alice → Alice  (conditional, 0-ASA self-transfer)
[1] ALGO Payment     — Alice → Bob    (deal amount)
[2] ASA Transfer     — Bob → Alice    (the asset)
[3] Fee Payment      — Alice → Charlie (5% of ALGO amount)
[4] App Call         — Anyone → DealRegistry.recordDeal()
```

All 5 (or 4 without opt-in) transactions are signed atomically.  
If **any** transaction fails or is missing, **all** revert — zero counterparty risk.

## Hackathon Pitch — Scalable System Design

This architecture achieves genuine scalability through three properties.
First, Algorand's Layer-1 atomic groups provide cryptographic settlement finality in ~3.5 seconds with no off-chain escrow, oracle, or intermediary state—eliminating the coordination bottleneck that plagues multi-step OTC flows on other chains.
Second, the TealScript `DealRegistry` contract acts as a lightweight on-chain verifier rather than a custodian: it reads the group context (amounts, asset IDs, receiver addresses) and rejects any group that violates the fee invariant, meaning the enforcement logic scales horizontally with every validator node at zero marginal cost.
Third, the agentic matchmaker (Charlie) is stateless—it constructs and co-signs transaction groups without holding funds, so any number of agents can operate concurrently without contention, making the system linearly scalable to market demand.

## License

MIT
