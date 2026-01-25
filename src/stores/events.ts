import { persistentAtom } from '@nanostores/persistent'
import { nanoquery } from '@nanostores/query'
import { computed } from 'nanostores'
import type { Address } from 'viem'
import {
  type CachedEvents,
  type EventData,
  eventsEncoder,
  fetchUserEvents
} from '@/lib/events'
import { $userAddress, $vaultsWithPositions } from './user'
import { $vaults } from './vaults'

export const EVENTS_CACHE_TTL = 30 * 60 * 1000

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

const $eventsKey = computed(
  [$userAddress, $vaultsWithPositions, $vaults],
  (address, vaultsWithPositions, vaultsState) => {
    const vaults = vaultsState.data ?? []
    if (!address || vaultsWithPositions.length === 0 || vaults.length === 0)
      return null
    return `${address}-${vaultsWithPositions.length}`
  }
)

const [createEventsFetcher] = nanoquery({
  fetcher: async (): Promise<EventData> => {
    const userAddress = $userAddress.get()
    const vaultsWithPositions = $vaultsWithPositions.get()
    const vaults = $vaults.get().data ?? []

    if (!userAddress || vaultsWithPositions.length === 0 || vaults.length === 0)
      return {}

    const cached = getCachedEvents(userAddress)
    if (cached) return cached

    const events = await fetchUserEvents(
      userAddress,
      vaults,
      vaultsWithPositions
    )
    $eventsCache.set({ data: events, cachedAt: Date.now(), userAddress })
    return events
  }
})

export const $userEvents = createEventsFetcher<EventData>(
  ['events', $eventsKey],
  {
    cacheLifetime: EVENTS_CACHE_TTL,
    revalidateInterval: EVENTS_CACHE_TTL
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
