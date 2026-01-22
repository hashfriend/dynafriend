const CACHE_KEY_PREFIX = 'dynavault_events_'
export const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

export interface CashFlow {
  amount: string // negative for deposits, positive for withdrawals
  timestamp: number
}

interface CachedEventData {
  timestamp: number
  data: Record<
    string,
    {
      deposited: string
      withdrawn: string
      cashFlows: CashFlow[]
    }
  >
}

export type EventData = Record<
  string,
  {
    deposited: bigint
    withdrawn: bigint
    cashFlows: { amount: bigint; timestamp: number }[]
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
        cashFlows: (value.cashFlows || []).map((cf) => ({
          amount: BigInt(cf.amount),
          timestamp: cf.timestamp
        }))
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
        cashFlows: CashFlow[]
      }
    > = {}
    for (const [key, value] of Object.entries(data)) {
      serializable[key] = {
        deposited: value.deposited.toString(),
        withdrawn: value.withdrawn.toString(),
        cashFlows: value.cashFlows.map((cf) => ({
          amount: cf.amount.toString(),
          timestamp: cf.timestamp
        }))
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
