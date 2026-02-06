# DynaFriend

Dashboard for viewing Singularity Finance's [DynaVault](https://www.singularityfinance.ai/vaults) positions.

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Data Flow](#data-flow)
- [Calculations](#calculations)
  - [Lifetime Profit](#lifetime-profit)
  - [Personal APY (XIRR)](#personal-apy-xirr)
- [Development](#development)

## Features

- View all DynaVault vaults with TVL and natively reported APY
- Track active and exited positions with their yield for each vault
- View historical events (deposits, withdrawals) for each position
- Show personal APY based on actual cash flows and current position value (XIRR)
- Summarize overall portfolio performance across all vaults

## Tech Stack

- React 19 + Vite + nanostores
- TypeScript + CSS modules
- wagmi v2 + viem + RainbowKit
- Alchemy API (event fetching)
- DefiLlama API (token prices)
- Bun

## Data Flow

All data is centralized in nanostores (`src/stores/`):

```
$vaultData ─────────────────────────── $userAddress
     │ (vaults + prices)                     │
     │                                       │
     └───────────────┬───────────────────────┘
                     │
                     ▼
               $userData
               (balances + events)
                     │
                     ▼
               $portfolio
               (positions + summary)
```

**$vaultData** fetches atomically:
- Vaults → RPC multicall
- Prices → DefiLlama API

**$userData** fetches atomically (waits for $vaultData):
- Balances → RPC multicall
- Events → Alchemy API (only for vaults with active or exited positions)

Vault data and event data are cached in localStorage for 30 min. Token prices are cached for 5 min.

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

APY is calculated using XIRR (Extended Internal Rate of Return), which properly weights each cash flow by time. This calculation is used in the summary ("Total APY") and for each individual vault position ("Your APY").

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
cp .env.example .env
bun install
bun dev
```

```bash
bun run format
bun run typecheck
bun run build
```
