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

interface BuildUserPositionsParams {
  vaults: VaultData[]
  eventData: EventData
  vaultsWithPositions: Address[]
  maxWithdrawMap: Map<Address, bigint>
  balanceMap: Map<Address, bigint>
}

/**
 * Build user positions from contract results and event data
 */
export function buildUserPositions({
  vaults,
  eventData,
  vaultsWithPositions,
  maxWithdrawMap,
  balanceMap
}: BuildUserPositionsParams): UserPosition[] {
  if (vaults.length === 0 || vaultsWithPositions.length === 0) {
    return []
  }

  const eventsReady = Object.keys(eventData).length > 0

  const result: UserPosition[] = []
  for (const vault of vaultsWithPositions) {
    const vaultData = vaults.find((v) => v.address === vault)
    const events = eventData[vault]
    const shares = balanceMap.get(vault) ?? 0n
    const currentValue = maxWithdrawMap.get(vault) ?? 0n

    if (!vaultData || shares === 0n) continue

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

interface BalanceFetchResult {
  balanceMap: Map<Address, bigint>
  vaultsWithPositions: Address[]
}

/**
 * Fetch user balances for all vaults and determine which have positions
 */
export async function fetchBalances(
  userAddress: Address
): Promise<BalanceFetchResult> {
  const client = getPublicClient()
  const contracts = VAULT_ADDRESSES.map((address) => ({
    address,
    abi: dynavaultAbi,
    functionName: 'balanceOf' as const,
    args: [userAddress] as const
  }))
  const results = (await client.multicall({ contracts })) as ContractResult[]

  const balanceMap = new Map<Address, bigint>()
  const vaultsWithPositions: Address[] = []

  for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
    const result = results[i]
    if (result.status === 'success') {
      const balance = result.result as bigint
      balanceMap.set(VAULT_ADDRESSES[i], balance)
      if (balance > 0n) {
        vaultsWithPositions.push(VAULT_ADDRESSES[i])
      }
    }
  }

  return { balanceMap, vaultsWithPositions }
}

/**
 * Fetch user maxWithdraw for specific vaults
 */
export async function fetchMaxWithdraw(
  userAddress: Address,
  vaultAddresses: Address[]
): Promise<Map<Address, bigint>> {
  if (vaultAddresses.length === 0) return new Map()

  const client = getPublicClient()
  const contracts = vaultAddresses.map((address) => ({
    address,
    abi: dynavaultAbi,
    functionName: 'maxWithdraw' as const,
    args: [userAddress] as const
  }))
  const results = (await client.multicall({ contracts })) as ContractResult[]

  const map = new Map<Address, bigint>()
  for (let i = 0; i < vaultAddresses.length; i++) {
    const result = results[i]
    if (result.status === 'success') {
      map.set(vaultAddresses[i], result.result as bigint)
    }
  }
  return map
}
