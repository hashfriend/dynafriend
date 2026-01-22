# DynaFriend

Dashboard for viewing Singularity Finance's DynaVault vault positions.

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Data Flow](#data-flow)
- [Calculations](#calculations)
  - [Lifetime Profit](#lifetime-profit)
  - [Personal APY (XIRR)](#personal-apy-xirr)
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
- Bun

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

### Personal APY (XIRR)

APY is calculated using XIRR (Extended Internal Rate of Return), which properly weights each cash flow by time.

```
Solve for r where: Σ(cashFlow_i / (1 + r)^years_i) = 0
```

Where:
- Each deposit is a negative cash flow at its timestamp
- Each withdrawal is a positive cash flow at its timestamp
- Current position value is a final positive cash flow at now

This handles any deposit/withdrawal pattern correctly, including multiple deposits, partial withdrawals, and exits/re-entries.

## Development

```bash
cp .env.example .env  # add VITE_ALCHEMY_API_ENDPOINT
bun install
bun dev
```
