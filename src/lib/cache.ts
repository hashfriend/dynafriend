const CACHE_KEY_PREFIX = 'dynavault_events_'
export const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

interface CachedEventData {
  timestamp: number
  data: Record<
    string,
    {
      deposited: string
      withdrawn: string
      positionStartTime: number | null
      depositedInPosition: string
      withdrawnInPosition: string
    }
  >
}

export type EventData = Record<
  string,
  {
    deposited: bigint
    withdrawn: bigint
    positionStartTime: number | null
    depositedInPosition: bigint
    withdrawnInPosition: bigint
  }
>

export interface CacheResult {
  data: EventData
  expiresAt: number
}

export function getCachedEvents(userAddress: string): CacheResult | null {
  try {
    const cached = localStorage.getItem(
      CACHE_KEY_PREFIX + userAddress.toLowerCase()
    )
    if (!cached) return null

    const parsed: CachedEventData = JSON.parse(cached)
    const expiresAt = parsed.timestamp + CACHE_TTL

    if (Date.now() > expiresAt) {
      localStorage.removeItem(CACHE_KEY_PREFIX + userAddress.toLowerCase())
      return null
    }

    const data: EventData = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      data[key] = {
        deposited: BigInt(value.deposited),
        withdrawn: BigInt(value.withdrawn),
        positionStartTime: value.positionStartTime ?? null,
        depositedInPosition: BigInt(value.depositedInPosition || '0'),
        withdrawnInPosition: BigInt(value.withdrawnInPosition || '0')
      }
    }
    return { data, expiresAt }
  } catch {
    return null
  }
}

export function setCachedEvents(userAddress: string, data: EventData) {
  try {
    const serializable: Record<
      string,
      {
        deposited: string
        withdrawn: string
        positionStartTime: number | null
        depositedInPosition: string
        withdrawnInPosition: string
      }
    > = {}
    for (const [key, value] of Object.entries(data)) {
      serializable[key] = {
        deposited: value.deposited.toString(),
        withdrawn: value.withdrawn.toString(),
        positionStartTime: value.positionStartTime,
        depositedInPosition: value.depositedInPosition.toString(),
        withdrawnInPosition: value.withdrawnInPosition.toString()
      }
    }

    const cached: CachedEventData = {
      timestamp: Date.now(),
      data: serializable
    }
    localStorage.setItem(
      CACHE_KEY_PREFIX + userAddress.toLowerCase(),
      JSON.stringify(cached)
    )
  } catch {
    // Ignore storage errors
  }
}
