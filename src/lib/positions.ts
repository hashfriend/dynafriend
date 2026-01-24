import type { Address } from 'viem'
import { fetchUserEvents } from '@/lib/alchemy'
import {
  type EventData,
  getCachedEvents,
  setCachedEvents
} from '@/lib/cache-events'
import type { ContractResult, VaultData } from '@/lib/dynavault'

export { CACHE_TTL, type EventData } from '@/lib/cache-events'

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
 * Fetch user events with localStorage caching
 */
export async function fetchEventsWithCache(
  userAddress: Address,
  vaults: VaultData[],
  vaultsWithPositions: Address[]
): Promise<EventData> {
  const cached = getCachedEvents(userAddress)
  if (cached) return cached.data

  const results = await fetchUserEvents(
    userAddress,
    vaults,
    vaultsWithPositions
  )
  setCachedEvents(userAddress, results)
  return results
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
