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
import type { EventData } from '@/lib/events'
import { getPublicClient } from './wagmi'

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
  vaultsWithHistory: Address[]
  maxWithdrawMap: Map<Address, bigint>
  balanceMap: Map<Address, bigint>
}

/**
 * Build user positions from contract results and event data.
 * Includes both active positions (shares > 0) and exited positions
 * (shares = 0 but have historical events) so users can still see
 * their earned yield and transaction history.
 */
export function buildUserPositions({
  vaults,
  eventData,
  vaultsWithHistory,
  maxWithdrawMap,
  balanceMap
}: BuildUserPositionsParams): UserPosition[] {
  if (vaults.length === 0 || vaultsWithHistory.length === 0) {
    return []
  }

  const eventsReady = Object.keys(eventData).length > 0

  const result: UserPosition[] = []
  for (const vault of vaultsWithHistory) {
    const vaultData = vaults.find((v) => v.address === vault)
    if (!vaultData) continue

    const events = eventData[vault]
    const shares = balanceMap.get(vault) ?? 0n
    const currentValue = maxWithdrawMap.get(vault) ?? 0n

    const totalDeposited = events?.deposited ?? 0n
    const totalWithdrawn = events?.withdrawn ?? 0n
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
      cashFlows: events?.cashFlows ?? []
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

    // Skip exited positions with incomplete event data from profit/APY
    const isExited = position.shares === 0n
    const hasIncompleteData =
      isExited &&
      position.cashFlows.length > 0 &&
      (position.totalDeposited === 0n ||
        position.totalWithdrawn === 0n ||
        (position.profit !== null && position.profit < 0n))

    if (hasIncompleteData) continue

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
