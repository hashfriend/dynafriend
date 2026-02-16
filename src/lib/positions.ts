import type { Address } from 'viem'
import { dynavaultAbi } from '@/abi/dynavault'
import { VAULT_ADDRESSES } from '@/config/vaults'
import {
  calculateApyFromUsd,
  calculateEstimatedYield,
  calculateWeightedApy,
  type YieldPeriod
} from '@/lib/apy'
import { toUsdValue } from '@/lib/convert'
import type { ContractResult, VaultData } from '@/lib/dynavaults'
import type { CashFlow, EventData } from '@/lib/events'
import { getPublicClient } from './wagmi'

/**
 * Filter cash flows to only the current active position period.
 * When a user fully exits (cumulative withdrawn >= cumulative deposited)
 * and re-enters, only cash flows from the re-entry are returned.
 */
function filterToActivePosition(cashFlows: CashFlow[]): CashFlow[] {
  if (cashFlows.length === 0) return cashFlows

  let deposited = 0n
  let withdrawn = 0n
  let lastExitIndex = -1

  for (let i = 0; i < cashFlows.length; i++) {
    const cf = cashFlows[i]
    if (cf.amount < 0n) {
      deposited += -cf.amount
    } else {
      withdrawn += cf.amount
    }

    if (withdrawn >= deposited && i < cashFlows.length - 1) {
      lastExitIndex = i
      deposited = 0n
      withdrawn = 0n
    }
  }

  if (lastExitIndex === -1) return cashFlows
  return cashFlows.slice(lastExitIndex + 1)
}

export interface UserPosition {
  vaultAddress: Address
  vaultData: VaultData
  shares: bigint
  currentValue: bigint
  totalDeposited: bigint
  totalWithdrawn: bigint
  profit: bigint | null
  cashFlows: { amount: bigint; timestamp: number; txHash: string }[]
}

interface BuildUserPositionsParams {
  vaults: VaultData[]
  eventData: EventData
  activeVaults: Address[]
  maxWithdrawMap: Map<Address, bigint>
  balanceMap: Map<Address, bigint>
}

/**
 * Build user positions from contract results and event data
 * for vaults where the user has active shares (balance > 0).
 */
export function buildUserPositions({
  vaults,
  eventData,
  activeVaults,
  maxWithdrawMap,
  balanceMap
}: BuildUserPositionsParams): UserPosition[] {
  if (vaults.length === 0 || activeVaults.length === 0) {
    return []
  }

  const eventsReady = Object.keys(eventData).length > 0

  const result: UserPosition[] = []
  for (const vault of activeVaults) {
    const vaultData = vaults.find((v) => v.address === vault)
    if (!vaultData) continue

    const events = eventData[vault]
    const shares = balanceMap.get(vault) ?? 0n
    const currentValue = maxWithdrawMap.get(vault) ?? 0n

    // Filter to current active period (ignores cash flows before a complete exit)
    const cashFlows = filterToActivePosition(events?.cashFlows ?? [])
    const totalDeposited = cashFlows.reduce(
      (sum, cf) => (cf.amount < 0n ? sum + -cf.amount : sum),
      0n
    )
    const totalWithdrawn = cashFlows.reduce(
      (sum, cf) => (cf.amount > 0n ? sum + cf.amount : sum),
      0n
    )
    const netInvested = totalDeposited - totalWithdrawn
    const profit = eventsReady ? currentValue - netInvested : null

    result.push({
      vaultAddress: vault,
      vaultData,
      shares,
      currentValue,
      totalDeposited,
      totalWithdrawn,
      profit,
      cashFlows
    })
  }

  return result
}

export interface PortfolioSummary {
  totalValue: number
  totalProfit: number
  profitReady: boolean
  portfolioApy: number | null
  estimatedYield: number | null
  yieldPeriod: YieldPeriod
}

/**
 * Build portfolio summary from positions and prices
 */
export function buildSummary(
  positions: UserPosition[],
  prices: Record<string, number>,
  yieldPeriod: YieldPeriod
): PortfolioSummary {
  let totalValue = 0
  let totalProfit = 0
  let profitReady = true
  const allCashFlows: { amount: number; timestamp: number }[] = []
  const positionValues: { value: number; apy: number | null }[] = []

  for (const position of positions) {
    const price = prices[position.vaultData.assetAddress.toLowerCase()]
    if (!price) continue

    const positionValue = toUsdValue(
      position.currentValue,
      position.vaultData.assetDecimals,
      price
    )
    totalValue += positionValue

    // Collect position value with vault's 24hr APY for weighted calculation
    positionValues.push({ value: positionValue, apy: position.vaultData.apy })

    if (position.profit !== null) {
      totalProfit += toUsdValue(
        position.profit,
        position.vaultData.assetDecimals,
        price
      )
    } else {
      profitReady = false
    }

    for (const cf of position.cashFlows) {
      allCashFlows.push({
        amount:
          (Number(cf.amount) / 10 ** position.vaultData.assetDecimals) * price,
        timestamp: cf.timestamp
      })
    }
  }

  const portfolioApy = calculateApyFromUsd(allCashFlows, totalValue)
  // Use weighted 24hr APY from vaults for yield projections
  const weightedApy = calculateWeightedApy(positionValues)

  return {
    totalValue,
    totalProfit,
    profitReady,
    portfolioApy,
    estimatedYield: calculateEstimatedYield(
      totalValue,
      weightedApy,
      yieldPeriod
    ),
    yieldPeriod
  }
}

export interface UserBalancesResult {
  balanceMap: Map<Address, bigint>
  maxWithdrawMap: Map<Address, bigint>
  vaultsWithPositions: Address[]
}

/**
 * Fetch balanceOf + maxWithdraw for all vaults in a single multicall
 */
export async function fetchUserBalances(
  userAddress: Address
): Promise<UserBalancesResult> {
  const client = getPublicClient()
  const contracts = VAULT_ADDRESSES.flatMap((address) => [
    {
      address,
      abi: dynavaultAbi,
      functionName: 'balanceOf' as const,
      args: [userAddress] as const
    },
    {
      address,
      abi: dynavaultAbi,
      functionName: 'maxWithdraw' as const,
      args: [userAddress] as const
    }
  ])
  const results = (await client.multicall({ contracts })) as ContractResult[]

  const balanceMap = new Map<Address, bigint>()
  const maxWithdrawMap = new Map<Address, bigint>()
  const vaultsWithPositions: Address[] = []

  for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
    const balanceResult = results[i * 2]
    const maxWithdrawResult = results[i * 2 + 1]

    if (balanceResult.status === 'success') {
      const balance = balanceResult.result as bigint
      balanceMap.set(VAULT_ADDRESSES[i], balance)
      if (balance > 0n) {
        vaultsWithPositions.push(VAULT_ADDRESSES[i])
        if (maxWithdrawResult.status === 'success') {
          maxWithdrawMap.set(
            VAULT_ADDRESSES[i],
            maxWithdrawResult.result as bigint
          )
        }
      }
    }
  }

  return { balanceMap, maxWithdrawMap, vaultsWithPositions }
}
