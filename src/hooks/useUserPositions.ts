import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useConnection, useReadContracts } from 'wagmi'
import { dynavaultAbi } from '@/abi/dynavault'
import { VAULT_ADDRESSES } from '@/config/vaults'
import { getCachedEvents } from '@/lib/cache-events'
import type { ContractResult, VaultData } from '@/lib/dynavault'
import {
  buildUserPositions,
  CACHE_TTL,
  extractVaultsWithPositions,
  fetchEventsWithCache,
  type UserPosition
} from '@/lib/positions'

interface UseUserPositionsResult {
  positions: UserPosition[]
  isLoading: boolean
  hasPositions: boolean
  cacheExpiresAt: number | null
}

export function useUserPositions(vaults: VaultData[]): UseUserPositionsResult {
  const { address: userAddress, status } = useConnection()
  const isConnected = status === 'connected'

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

  const vaultsWithPositions = useMemo(
    () => extractVaultsWithPositions(balanceResults, VAULT_ADDRESSES),
    [balanceResults]
  )

  const vaultsKey = vaultsWithPositions.join(',')
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

  const positions = useMemo(
    () =>
      buildUserPositions({
        balanceResults,
        maxWithdrawResults,
        vaults,
        eventData,
        vaultsWithPositions,
        vaultAddresses: VAULT_ADDRESSES
      }),
    [balanceResults, maxWithdrawResults, vaults, eventData, vaultsWithPositions]
  )

  return {
    positions,
    isLoading: isBalanceLoading || isMaxWithdrawLoading || isLoadingEvents,
    hasPositions: positions.length > 0,
    cacheExpiresAt
  }
}
