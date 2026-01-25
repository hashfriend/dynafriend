import { persistentAtom } from '@nanostores/persistent'
import { nanoquery } from '@nanostores/query'
import { computed } from 'nanostores'
import {
  type CachedVaults,
  fetchVaults,
  type VaultData,
  vaultsEncoder
} from '@/lib/dynavaults'
import { getPublicClient } from '@/lib/wagmi'

export const VAULTS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const $persistedCache = persistentAtom<CachedVaults | null>(
  'dynavault_vaults',
  null,
  vaultsEncoder
)

function getCachedIfFresh(): VaultData[] | null {
  const cached = $persistedCache.get()
  if (cached && Date.now() - cached.cachedAt < VAULTS_CACHE_TTL) {
    return cached.data
  }
  return null
}

const [createFetcherStore] = nanoquery({
  fetcher: async (): Promise<VaultData[]> => {
    const cached = getCachedIfFresh()
    if (cached) return cached

    const vaults = await fetchVaults(getPublicClient())
    $persistedCache.set({ data: vaults, cachedAt: Date.now() })
    return vaults
  }
})

export const $vaults = createFetcherStore<VaultData[]>(['vaults'], {
  cacheLifetime: VAULTS_CACHE_TTL,
  revalidateInterval: VAULTS_CACHE_TTL
})

export const $vaultsCacheExpiresAt = computed($persistedCache, (cached) => {
  if (!cached) return null
  return cached.cachedAt + VAULTS_CACHE_TTL
})
