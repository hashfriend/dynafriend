import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Address } from 'viem'
import { useAccount } from 'wagmi'
import {
  type CachedEvents,
  type EventData,
  eventsEncoder,
  fetchUserEvents
} from '@/lib/events'
import { fetchUserBalances } from '@/lib/positions'
import { useVaultData } from './useVaultData'

// localStorage cache TTL for events (historical data, changes rarely)
export const EVENTS_CACHE_TTL = 30 * 60 * 1000 // 30 min

export interface UserDataState {
  balanceMap: Map<Address, bigint>
  maxWithdrawMap: Map<Address, bigint>
  events: EventData
  vaultsWithPositions: Address[]
}

function readEventsCache(): CachedEvents | null {
  try {
    const raw = localStorage.getItem('dynavault_events')
    if (!raw) return null
    return eventsEncoder.decode(raw)
  } catch {
    return null
  }
}

function writeEventsCache(data: EventData, userAddress: string): void {
  const cached: CachedEvents = { data, cachedAt: Date.now(), userAddress }
  localStorage.setItem('dynavault_events', eventsEncoder.encode(cached))
}

function getCachedEvents(userAddress: Address): EventData | null {
  const cached = readEventsCache()
  if (!cached) return null
  if (cached.userAddress.toLowerCase() !== userAddress.toLowerCase())
    return null
  if (Date.now() - cached.cachedAt > EVENTS_CACHE_TTL) return null
  return cached.data
}

function getEventsCacheExpiresAt(
  userAddress: Address | undefined
): number | null {
  if (!userAddress) return null
  const cached = readEventsCache()
  if (!cached) return null
  if (cached.userAddress.toLowerCase() !== userAddress.toLowerCase())
    return null
  return cached.cachedAt + EVENTS_CACHE_TTL
}

interface UseUserDataReturn {
  userData: UserDataState | null
  isLoading: boolean
  error: Error | null
  eventsCacheExpiresAt: number | null
}

export function useUserData(): UseUserDataReturn {
  const { address } = useAccount()
  const { vaults } = useVaultData()

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-data', address],
    queryFn: async (): Promise<UserDataState> => {
      const userAddress = address as Address

      const { balanceMap, maxWithdrawMap, vaultsWithPositions } =
        await fetchUserBalances(userAddress)

      let events: EventData = {}
      const cached = getCachedEvents(userAddress)
      if (cached) {
        events = cached
      } else {
        events = await fetchUserEvents(userAddress, vaults, vaultsWithPositions)
        writeEventsCache(events, userAddress)
      }

      return { balanceMap, maxWithdrawMap, events, vaultsWithPositions }
    },
    enabled: !!address && vaults.length > 0,
    staleTime: 30_000,
    gcTime: Infinity,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000
  })

  return {
    userData: data ?? null,
    isLoading,
    error: error ?? null,
    eventsCacheExpiresAt: getEventsCacheExpiresAt(address)
  }
}

/**
 * Call this when a transaction is confirmed to invalidate the events cache
 * so fresh data is fetched on next revalidation
 */
export function useInvalidateUserData(): () => void {
  const queryClient = useQueryClient()
  return () => {
    localStorage.removeItem('dynavault_events')
    queryClient.invalidateQueries({ queryKey: ['user-data'] })
  }
}
