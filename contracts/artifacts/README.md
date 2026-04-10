# artifacts/

This directory is populated by the TealScript compiler when you run:

```bash
npm run build
```

It will contain:
- `DealRegistry/DealRegistry.arc32.json`  — ARC-32 app spec
- `DealRegistry/DealRegistryClient.ts`    — Typed AlgoKit client
- `DealRegistry/approval.teal`            — Compiled approval program
- `DealRegistry/clear.teal`               — Compiled clear state program
