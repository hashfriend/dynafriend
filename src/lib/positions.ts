import type { Address } from 'viem'
import { dynavaultAbi } from '@/abi/dynavault'
import { VAULT_ADDRESSES } from '@/config/vaults'
import { calculateApyFromUsd } from '@/lib/apy'
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

/**
 * Extract vault addresses where user has shares
 */
export function extractVaultsWithPositions(
  balanceResults: ContractResult[] | undefined,
  vaultAddresses: Address[]
): Address[] {
  if (!balanceResults) return []

  const result: Address[] = []
  for (let i = 0; i < vaultAddresses.length; i++) {
    const balanceResult = balanceResults[i]
    if (
      balanceResult?.status === 'success' &&
      (balanceResult.result as bigint) > 0n
    ) {
      result.push(vaultAddresses[i])
    }
  }
  return result
}

interface BuildUserPositionsParams {
  balanceResults: ContractResult[] | undefined
  maxWithdrawResults: ContractResult[] | undefined
  vaults: VaultData[]
  eventData: EventData
  vaultsWithPositions: Address[]
  vaultAddresses: Address[]
}

/**
 * Build user positions from contract results and event data
 */
export function buildUserPositions({
  balanceResults,
  maxWithdrawResults,
  vaults,
  eventData,
  vaultsWithPositions,
  vaultAddresses
}: BuildUserPositionsParams): UserPosition[] {
  if (!balanceResults || !maxWithdrawResults || vaults.length === 0) {
    return []
  }

  const eventsReady =
    vaultsWithPositions.length === 0 || Object.keys(eventData).length > 0

  const result: UserPosition[] = []
  for (let i = 0; i < vaultAddresses.length; i++) {
    const vault = vaultAddresses[i]
    const balanceResult = balanceResults[i]
    const maxWithdrawResult = maxWithdrawResults[i]
    const vaultData = vaults.find((v) => v.address === vault)
    const events = eventData[vault]

    if (!vaultData) continue

    const shares =
      balanceResult?.status === 'success'
        ? (balanceResult.result as bigint)
        : 0n

    const currentValue =
      maxWithdrawResult?.status === 'success'
        ? (maxWithdrawResult.result as bigint)
        : 0n

    const totalDeposited = events?.deposited ?? 0n
    const totalWithdrawn = events?.withdrawn ?? 0n
    const netInvested = totalDeposited - totalWithdrawn
    const profit = eventsReady ? currentValue - netInvested : null

    if (shares > 0n) {
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
  }

  return result
}

export interface PortfolioSummary {
  totalValue: number
  totalProfit: number
  profitReady: boolean
  portfolioApy: number | null
}

/**
 * Build portfolio summary from positions and prices
 */
export function buildSummary(
  positions: UserPosition[],
  prices: Record<string, number>
): PortfolioSummary {
  let totalValue = 0
  let totalProfit = 0
  let profitReady = true
  const allCashFlows: { amount: number; timestamp: number }[] = []

  for (const position of positions) {
    const price = prices[position.vaultData.assetAddress.toLowerCase()]
    if (!price) continue

    totalValue += toUsdValue(
      position.currentValue,
      position.vaultData.assetDecimals,
      price
    )

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

  return {
    totalValue,
    totalProfit,
    profitReady,
    portfolioApy: calculateApyFromUsd(allCashFlows, totalValue)
  }
}

/**
 * Fetch user balances for all vaults
 */
export async function fetchBalances(
  userAddress: Address
): Promise<ContractResult[]> {
  const client = getPublicClient()
  const contracts = VAULT_ADDRESSES.map((address) => ({
    address,
    abi: dynavaultAbi,
    functionName: 'balanceOf' as const,
    args: [userAddress] as const
  }))
  return client.multicall({ contracts }) as Promise<ContractResult[]>
}

/**
 * Fetch user maxWithdraw for all vaults
 */
export async function fetchMaxWithdraw(
  userAddress: Address
): Promise<ContractResult[]> {
  const client = getPublicClient()
  const contracts = VAULT_ADDRESSES.map((address) => ({
    address,
    abi: dynavaultAbi,
    functionName: 'maxWithdraw' as const,
    args: [userAddress] as const
  }))
  return client.multicall({ contracts }) as Promise<ContractResult[]>
}
