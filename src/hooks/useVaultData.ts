import { useQuery } from '@tanstack/react-query'
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

interface CachedPrices {
  data: Record<string, number>
  cachedAt: number
}

function readVaultsCache(): CachedVaults | null {
  try {
    const raw = localStorage.getItem('dynavault_vaults')
    if (!raw) return null
    return vaultsEncoder.decode(raw)
  } catch {
    return null
  }
}

function writeVaultsCache(data: VaultData[]): void {
  const cached: CachedVaults = { data, cachedAt: Date.now() }
  localStorage.setItem('dynavault_vaults', vaultsEncoder.encode(cached))
}

function getCachedVaults(): VaultData[] | null {
  const cached = readVaultsCache()
  if (cached && Date.now() - cached.cachedAt < VAULTS_CACHE_TTL) {
    return cached.data
  }
  return null
}

function readPricesCache(): CachedPrices | null {
  try {
    const raw = localStorage.getItem('dynavault_prices')
    if (!raw) return null
    return JSON.parse(raw) as CachedPrices
  } catch {
    return null
  }
}

function writePricesCache(data: Record<string, number>): void {
  const cached: CachedPrices = { data, cachedAt: Date.now() }
  localStorage.setItem('dynavault_prices', JSON.stringify(cached))
}

function getCachedPrices(
  assetAddresses: string[]
): Record<string, number> | null {
  const cached = readPricesCache()
  if (!cached || Date.now() - cached.cachedAt >= PRICES_CACHE_TTL) return null

  const needed = new Set(assetAddresses.map((a) => a.toLowerCase()))
  const hasAll = [...needed].every((addr) => addr in cached.data)
  return hasAll ? cached.data : null
}

interface VaultDataResult {
  vaults: VaultData[]
  prices: Record<string, number>
}

async function fetchVaultData(): Promise<VaultDataResult> {
  let vaults = getCachedVaults()
  if (!vaults) {
    vaults = await fetchVaults(getPublicClient())
    writeVaultsCache(vaults)
  }

  const assetAddresses = vaults.map((v) => v.assetAddress)
  let prices = getCachedPrices(assetAddresses)
  if (!prices) {
    prices = await fetchPrices(assetAddresses)
    writePricesCache(prices)
  }

  return { vaults, prices }
}

interface UseVaultDataReturn {
  vaults: VaultData[]
  prices: Record<string, number>
  isLoading: boolean
  error: Error | null
}

export function useVaultData(): UseVaultDataReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vault-data'],
    queryFn: fetchVaultData,
    staleTime: 60_000,
    gcTime: Infinity,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000
  })

  return {
    vaults: data?.vaults ?? [],
    prices: data?.prices ?? {},
    isLoading,
    error: error ?? null
  }
}
