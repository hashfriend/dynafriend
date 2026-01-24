const VAULT_DATA_CACHE_KEY = 'dynavault_data'
export const VAULT_CACHE_TTL = 1000 * 60 * 30 // 30 minutes

interface CachedVaultData {
  timestamp: number
  data: {
    address: string
    name: string
    symbol: string
    decimals: number
    assetAddress: string
    assetSymbol: string
    assetDecimals: number
    totalAssets: string
    totalSupply: string
    externalUrl: string
    apy: number | null
  }[]
}

export interface VaultDataCache {
  address: string
  name: string
  symbol: string
  decimals: number
  assetAddress: string
  assetSymbol: string
  assetDecimals: number
  totalAssets: bigint
  totalSupply: bigint
  externalUrl: string
  apy: number | null
}

export interface VaultCacheResult {
  data: VaultDataCache[]
  expiresAt: number
}

export function getCachedVaultData(): VaultCacheResult | null {
  try {
    const cached = localStorage.getItem(VAULT_DATA_CACHE_KEY)
    if (!cached) return null

    const parsed: CachedVaultData = JSON.parse(cached)
    const expiresAt = parsed.timestamp + VAULT_CACHE_TTL

    if (Date.now() > expiresAt) {
      localStorage.removeItem(VAULT_DATA_CACHE_KEY)
      return null
    }

    const data: VaultDataCache[] = parsed.data.map((v) => ({
      ...v,
      totalAssets: BigInt(v.totalAssets),
      totalSupply: BigInt(v.totalSupply)
    }))

    return { data, expiresAt }
  } catch {
    return null
  }
}

export function setCachedVaultData(data: VaultDataCache[]) {
  try {
    const serializable = data.map((v) => ({
      ...v,
      totalAssets: v.totalAssets.toString(),
      totalSupply: v.totalSupply.toString()
    }))

    const cached: CachedVaultData = {
      timestamp: Date.now(),
      data: serializable
    }
    localStorage.setItem(VAULT_DATA_CACHE_KEY, JSON.stringify(cached))
  } catch {
    // Ignore storage errors
  }
}
