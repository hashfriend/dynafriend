import { persistentAtom } from '@nanostores/persistent'
import { nanoquery } from '@nanostores/query'
import { atom, computed } from 'nanostores'
import type { Address } from 'viem'
import {
  type CachedEvents,
  type EventData,
  eventsEncoder,
  fetchUserEvents
} from '@/lib/events'
import { fetchUserBalances } from '@/lib/positions'
import { $vaultData } from './vault-data'

// localStorage cache TTL for events (historical data, changes rarely)
export const EVENTS_CACHE_TTL = 30 * 60 * 1000 // 30 min

// How often nanoquery calls the fetcher (balances can change frequently)
const REVALIDATE_INTERVAL = 120_000 // 2 min

export const $userAddress = atom<Address | null>(null)

export interface UserDataState {
  balanceMap: Map<Address, bigint>
  maxWithdrawMap: Map<Address, bigint>
  events: EventData
  vaultsWithPositions: Address[]
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

// Latch: once vaults have loaded, this stays true so $userDataKey doesn't
// flip to null during vault refetches (which would reset the $userData store).
const $vaultsLoaded = atom(false)
$vaultData.subscribe((state) => {
  if (!$vaultsLoaded.get() && state.data && state.data.vaults.length > 0) {
    $vaultsLoaded.set(true)
  }
})

const $userDataKey = computed(
  [$userAddress, $vaultsLoaded],
  (address, vaultsLoaded) => {
    if (!address || !vaultsLoaded) return null
    return address
  }
)

const [createUserDataFetcher] = nanoquery({
  fetcher: async (): Promise<UserDataState | null> => {
    const userAddress = $userAddress.get()
    const vaultDataState = $vaultData.get()
    const vaults = vaultDataState.data?.vaults ?? []

    if (!userAddress || vaults.length === 0) return null

    // Fetch balances + maxWithdraw in a single multicall
    const { balanceMap, maxWithdrawMap, vaultsWithPositions } =
      await fetchUserBalances(userAddress)

    // Fetch events only for vaults where user has active shares
    let events: EventData = {}
    const cached = getCachedEvents(userAddress)
    if (cached) {
      events = cached
    } else {
      events = await fetchUserEvents(userAddress, vaults, vaultsWithPositions)
      $eventsCache.set({ data: events, cachedAt: Date.now(), userAddress })
    }

    return {
      balanceMap,
      maxWithdrawMap,
      events,
      vaultsWithPositions
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
