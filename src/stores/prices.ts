import { nanoquery } from '@nanostores/query'
import { computed } from 'nanostores'
import { fetchPrices } from '@/lib/prices'
import { $vaults } from './vaults'

const CACHE_TTL = 60 * 5000 // 5 minutes

const $assetAddresses = computed($vaults, (state) => {
  const vaults = state.data ?? []
  return vaults.map((v) => v.assetAddress)
})

const $pricesKey = computed($assetAddresses, (addresses) => {
  if (addresses.length === 0) return null
  return addresses
    .map((a) => a.toLowerCase())
    .sort()
    .join(',')
})

const [createFetcherStore] = nanoquery({
  fetcher: async (): Promise<Record<string, number>> => {
    return fetchPrices($assetAddresses.get())
  }
})

export const $prices = createFetcherStore<Record<string, number>>(
  ['prices', $pricesKey],
  {
    cacheLifetime: CACHE_TTL,
    revalidateInterval: CACHE_TTL
  }
)
