import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { useConnection, useReadContracts } from 'wagmi'
import { dynavaultAbi } from '@/abi/dynavault'
import { VAULT_ADDRESSES } from '@/config/vaults'
import type { VaultData } from '@/hooks/useVaultData'
import { fetchUserEvents } from '@/lib/alchemy'
import {
  CACHE_TTL,
  type EventData,
  getCachedEvents,
  setCachedEvents
} from '@/lib/cache-events'

type ContractResult =
  | { status: 'success'; result: unknown }
  | { status: 'failure'; error: Error }

export interface UserPosition {
  vaultAddress: Address
  vaultData: VaultData
  shares: bigint
  currentValue: bigint
  totalDeposited: bigint
  totalWithdrawn: bigint
  profit: bigint | null
  cashFlows: { amount: bigint; timestamp: number }[]
}

async function fetchEventsWithCache(
  userAddress: Address,
  vaults: VaultData[],
  vaultsWithPositions: Address[]
): Promise<EventData> {
  // Check localStorage cache first
  const cached = getCachedEvents(userAddress)
  if (cached) {
    return cached.data
  }

  // Fetch fresh data
  const results = await fetchUserEvents(
    userAddress,
    vaults,
    vaultsWithPositions
  )

  // Persist to localStorage
  setCachedEvents(userAddress, results)

  return results
}

export function useUserPositions(vaults: VaultData[]) {
  const { address: userAddress, status } = useConnection()
  const isConnected = status === 'connected'

  // Get share balances for all vaults
  const balanceContracts = useMemo(
    () =>
      VAULT_ADDRESSES.map((address) => ({
        address,
        abi: dynavaultAbi,
        functionName: 'balanceOf' as const,
        args: [userAddress] as const
      })),
    [userAddress]
  )

  const { data: balanceResults, isLoading: isBalanceLoading } =
    useReadContracts({
      contracts: balanceContracts,
      query: {
        enabled: isConnected && !!userAddress,
        staleTime: 30000,
        refetchInterval: 60000
      }
    }) as {
      data: ContractResult[] | undefined
      isLoading: boolean
    }

  // Get maxWithdraw for each vault
  const maxWithdrawContracts = useMemo(
    () =>
      VAULT_ADDRESSES.map((address) => ({
        address,
        abi: dynavaultAbi,
        functionName: 'maxWithdraw' as const,
        args: [userAddress] as const
      })),
    [userAddress]
  )

  const { data: maxWithdrawResults, isLoading: isMaxWithdrawLoading } =
    useReadContracts({
      contracts: maxWithdrawContracts,
      query: {
        enabled: isConnected && !!userAddress,
        staleTime: 30000,
        refetchInterval: 60000
      }
    }) as {
      data: ContractResult[] | undefined
      isLoading: boolean
    }

  // Vaults where user has shares (for event fetching)
  const vaultsWithPositions = useMemo(() => {
    if (!balanceResults) return []
    const result: Address[] = []
    for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
      const balanceResult = balanceResults[i]
      if (
        balanceResult?.status === 'success' &&
        (balanceResult.result as bigint) > 0n
      ) {
        result.push(VAULT_ADDRESSES[i])
      }
    }
    return result
  }, [balanceResults])

  // Stable key for vaults with positions
  const vaultsKey = vaultsWithPositions.join(',')

  // Get cached data for initialData
  const cachedEvents = userAddress ? getCachedEvents(userAddress) : null

  const {
    data: eventData = {},
    isLoading: isLoadingEvents,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['userEvents', userAddress, vaultsKey],
    queryFn: () => {
      if (!userAddress) throw new Error('No user address')
      return fetchEventsWithCache(userAddress, vaults, vaultsWithPositions)
    },
    enabled:
      isConnected &&
      !!userAddress &&
      vaults.length > 0 &&
      vaultsWithPositions.length > 0,
    staleTime: CACHE_TTL,
    gcTime: CACHE_TTL,
    initialData: cachedEvents?.data,
    initialDataUpdatedAt: cachedEvents
      ? cachedEvents.expiresAt - CACHE_TTL
      : undefined
  })

  const cacheExpiresAt =
    dataUpdatedAt && dataUpdatedAt > 0 ? dataUpdatedAt + CACHE_TTL : null

  // Combine results into positions
  const positions = useMemo(() => {
    const result: UserPosition[] = []
    if (!balanceResults || !maxWithdrawResults || vaults.length === 0) {
      return result
    }

    const eventsReady =
      vaultsWithPositions.length === 0 || Object.keys(eventData).length > 0

    for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
      const vault = VAULT_ADDRESSES[i]
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
  }, [
    balanceResults,
    maxWithdrawResults,
    vaults,
    eventData,
    vaultsWithPositions
  ])

  return {
    positions,
    isLoading: isBalanceLoading || isMaxWithdrawLoading || isLoadingEvents,
    hasPositions: positions.length > 0,
    cacheExpiresAt
  }
}
