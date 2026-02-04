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

    // Fetch balances first to determine which vaults have positions
    const { balanceMap, vaultsWithPositions } = await fetchBalances(userAddress)

    // Fetch maxWithdraw for vaults with positions
    const maxWithdrawMap = await fetchMaxWithdraw(
      userAddress,
      vaultsWithPositions
    )

    // Fetch events (from cache or network) for vaults with positions
    let events: EventData = {}
    if (vaultsWithPositions.length > 0) {
      const cached = getCachedEvents(userAddress)
      if (cached) {
        events = cached
      } else {
        events = await fetchUserEvents(userAddress, vaults, vaultsWithPositions)
        $eventsCache.set({ data: events, cachedAt: Date.now(), userAddress })
        // Clear pending state since we now have fresh event data
        $transactionPending.set(false)
      }
    }

    return { balanceMap, maxWithdrawMap, events, vaultsWithPositions }
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

// Track when a new transaction has occurred but events haven't been refreshed yet
export const $transactionPending = atom<boolean>(false)

/**
 * Call this when a transaction is confirmed to invalidate the events cache
 * and mark APY values as pending until fresh data is fetched
 */
export function invalidateEventsCache(): void {
  $eventsCache.set(null)
  $transactionPending.set(true)
}
