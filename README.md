# DynaVault Dashboard

Dashboard for viewing Singularity Finance's DynaVault vault positions.

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Data Flow](#data-flow)
- [Calculations](#calculations)
  - [Lifetime Profit](#lifetime-profit)
  - [Personal APY](#personal-apy)
- [Development](#development)

## Features

- View all DynaVault vaults with TVL
- Track personal positions with their profit
- Show personal, actual APY

## Tech Stack

- React 19 + Vite
- TypeScript + CSS modules
- wagmi v3 + viem + RainbowKit
- Alchemy API (event fetching)
- DefiLlama API (token prices)

## Data Flow

- 30-minute client-side caching for event data

```
1. Vault data     → useReadContracts (RPC multicall)
2. User balances  → useReadContracts (RPC multicall)
3. Token prices   → DefiLlama API
4. Profit calc    → Alchemy API (only for vaults with positions)
                    └─ getAssetTransfers → withdrawals
                    └─ getAssetTransfers + getTransactionReceipt → deposits
```

## Calculations

### Lifetime Profit

```
profit = currentValue - (totalDeposited - totalWithdrawn)
```

Where:
- `currentValue` = `maxWithdraw(user)` from vault contract
- `totalDeposited` = sum of all Deposit event amounts
- `totalWithdrawn` = sum of all asset transfers from vault to user

### Personal APY

APY is calculated per-position. A position starts when balance goes from 0 → positive (resets on full exit and re-entry).

```
netInvestedInPosition = depositedInPosition - withdrawnInPosition
positionProfit = currentValue - netInvestedInPosition
holdingDays = (now - positionStartTime) / 86400
returnRate = positionProfit / netInvestedInPosition
APY = ((1 + returnRate) ^ (365 / holdingDays) - 1) × 100
```

## Development

```bash
cp .env.example .env  # add VITE_ALCHEMY_API_ENDPOINT
bun install
bun dev
```
