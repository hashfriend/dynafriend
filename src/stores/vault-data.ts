import { persistentAtom } from '@nanostores/persistent'
import { nanoquery } from '@nanostores/query'
import { computed } from 'nanostores'
import {
  type CachedVaults,
  fetchVaults,
  type VaultData,
  vaultsEncoder
} from '@/lib/dynavaults'
import { fetchPrices } from '@/lib/prices'
import { getPublicClient } from '@/lib/wagmi'

// localStorage cache TTLs
export const VAULTS_CACHE_TTL = 30 * 60 * 1000 // 30 min - vault metadata changes slowly
const PRICES_CACHE_TTL = 5 * 60 * 1000 // 5 min - prices change frequently

// How often nanoquery calls the fetcher (use shortest TTL)
const REVALIDATE_INTERVAL = PRICES_CACHE_TTL

export interface VaultDataState {
  vaults: VaultData[]
  prices: Record<string, number>
}

interface CachedPrices {
  data: Record<string, number>
  cachedAt: number
}

const $vaultsCache = persistentAtom<CachedVaults | null>(
  'dynavault_vaults',
  null,
  vaultsEncoder
)

const $pricesCache = persistentAtom<CachedPrices | null>(
  'dynavault_prices',
  null,
  {
    encode: JSON.stringify,
    decode: JSON.parse
  }
)

function getCachedVaults(): VaultData[] | null {
  const cached = $vaultsCache.get()
  if (cached && Date.now() - cached.cachedAt < VAULTS_CACHE_TTL) {
    return cached.data
  }
  return null
}

function getCachedPrices(
  assetAddresses: string[]
): Record<string, number> | null {
  const cached = $pricesCache.get()
  if (!cached || Date.now() - cached.cachedAt >= PRICES_CACHE_TTL) return null

  const needed = new Set(assetAddresses.map((a) => a.toLowerCase()))
  const hasAll = [...needed].every((addr) => addr in cached.data)
  return hasAll ? cached.data : null
}

const [createVaultDataFetcher] = nanoquery({
  fetcher: async (): Promise<VaultDataState> => {
    // Fetch vaults (from cache or network)
    let vaults = getCachedVaults()
    if (!vaults) {
      vaults = await fetchVaults(getPublicClient())
      $vaultsCache.set({ data: vaults, cachedAt: Date.now() })
    }

    // Fetch prices (from cache or network)
    const assetAddresses = vaults.map((v) => v.assetAddress)
    let prices = getCachedPrices(assetAddresses)
    if (!prices) {
      prices = await fetchPrices(assetAddresses)
      $pricesCache.set({ data: prices, cachedAt: Date.now() })
    }

    return { vaults, prices }
  }
})

export const $vaultData = createVaultDataFetcher<VaultDataState>(
  ['vault-data'],
  {
    cacheLifetime: REVALIDATE_INTERVAL,
    revalidateInterval: REVALIDATE_INTERVAL
  }
)

export const $vaultDataLoading = computed($vaultData, (state) => state.loading)

export const $vaultsCacheExpiresAt = computed($vaultsCache, (cached) => {
  if (!cached) return null
  return cached.cachedAt + VAULTS_CACHE_TTL
})
