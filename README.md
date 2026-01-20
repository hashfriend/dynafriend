# DynaVault Dashboard

Dashboard for viewing Singularity Finance's DynaVault vault positions.

## Features

- View all DynaVault vaults with TVL
- Track personal positions with their profit

## Tech Stack

- React 19 + Vite
- TypeScript + CSS modules
- wagmi v3 + viem + RainbowKit
- Alchemy API (event fetching)
- DefiLlama API (token prices)

## Data Flow

- Profit calculation from on-chain deposit/withdrawal history
- 30-minute client-side caching for event data

```
1. Vault data     → useReadContracts (RPC multicall)
2. User balances  → useReadContracts (RPC multicall)
3. Token prices   → DefiLlama API
4. Profit calc    → Alchemy API (only for vaults with positions)
                    └─ getAssetTransfers → withdrawals
                    └─ getAssetTransfers + getTransactionReceipt → deposits
```

## Development

```bash
cp .env.example .env  # add VITE_ALCHEMY_API_ENDPOINT
bun install
bun dev
```
