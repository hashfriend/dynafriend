import { persistentAtom } from '@nanostores/persistent'
import { nanoquery } from '@nanostores/query'
import { atom, computed } from 'nanostores'
import type { Address } from 'viem'
import { VAULT_ADDRESSES } from '@/config/vaults'
import {
  type CachedEvents,
  type EventData,
  eventsEncoder,
  fetchUserEvents
} from '@/lib/events'
import { fetchBalances, fetchMaxWithdraw } from '@/lib/positions'
import { $vaultData } from './vault-data'

// localStorage cache TTL for events (historical data, changes rarely)
export const EVENTS_CACHE_TTL = 30 * 60 * 1000 // 30 min

// How often nanoquery calls the fetcher (balances can change frequently)
const REVALIDATE_INTERVAL = 60_000 // 1 min

export const $userAddress = atom<Address | null>(null)

export interface UserDataState {
  balanceMap: Map<Address, bigint>
  maxWithdrawMap: Map<Address, bigint>
  events: EventData
  vaultsWithPositions: Address[]
  vaultsWithHistory: Address[]
}

const $eventsCache = persistentAtom<CachedEvents | null>(
  'dynavault_events',
  null,
  eventsEncoder
)

function getCachedEvents(userAddress: Address): EventData | null {
  const cached = $eventsCache.get()
  if (!cached) return null
  if (cached.userAddress.toLowerCase() !== userAddress.toLowerCase())
    return null
  if (Date.now() - cached.cachedAt > EVENTS_CACHE_TTL) return null
  return cached.data
}

const $userDataKey = computed(
  [$userAddress, $vaultData],
  (address, vaultDataState) => {
    const vaults = vaultDataState.data?.vaults ?? []
    if (!address || vaults.length === 0) return null
    return address
  }
)

const [createUserDataFetcher] = nanoquery({
  fetcher: async (): Promise<UserDataState | null> => {
    const userAddress = $userAddress.get()
    const vaultDataState = $vaultData.get()
    const vaults = vaultDataState.data?.vaults ?? []

    if (!userAddress || vaults.length === 0) return null

    // Fetch balances first to determine which vaults have active positions
    const { balanceMap, vaultsWithPositions } = await fetchBalances(userAddress)

    // Fetch maxWithdraw for vaults with active positions
    const maxWithdrawMap = await fetchMaxWithdraw(
      userAddress,
      vaultsWithPositions
    )

    // Fetch events for ALL vaults (so we can show historical positions too)
    let events: EventData = {}
    const cached = getCachedEvents(userAddress)
    if (cached) {
      events = cached
    } else {
      events = await fetchUserEvents(userAddress, vaults, VAULT_ADDRESSES)
      $eventsCache.set({ data: events, cachedAt: Date.now(), userAddress })
    }

    // Vaults with history = active positions + vaults with past events
    const activeSet = new Set(vaultsWithPositions.map((a) => a.toLowerCase()))
    const vaultsWithHistory = VAULT_ADDRESSES.filter((addr) => {
      if (activeSet.has(addr.toLowerCase())) return true
      const vaultEvents = events[addr]
      return vaultEvents && vaultEvents.cashFlows.length > 0
    })

    return {
      balanceMap,
      maxWithdrawMap,
      events,
      vaultsWithPositions,
      vaultsWithHistory
    }
  }
})

export const $userData = createUserDataFetcher<UserDataState | null>(
  ['user-data', $userDataKey],
  {
    cacheLifetime: REVALIDATE_INTERVAL,
    revalidateInterval: REVALIDATE_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  }
)

export const $userDataLoading = computed($userData, (state) => state.loading)

export const $eventsCacheExpiresAt = computed(
  [$eventsCache, $userAddress],
  (cached, userAddress) => {
    if (!cached || !userAddress) return null
    if (cached.userAddress.toLowerCase() !== userAddress.toLowerCase())
      return null
    return cached.cachedAt + EVENTS_CACHE_TTL
  }
)

/**
 * Call this when a transaction is confirmed to invalidate the events cache
 * so fresh data is fetched on next revalidation
 */
export function invalidateEventsCache(): void {
  $eventsCache.set(null)
}
