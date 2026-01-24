import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { usePublicClient, useReadContracts } from 'wagmi'
import { erc20Abi } from '@/abi/erc20'
import { VAULT_ADDRESSES } from '@/config/vaults'
import {
  getCachedVaultData,
  setCachedVaultData,
  VAULT_CACHE_TTL
} from '@/lib/cache-vaults'
import {
  type ContractResult,
  enrichVaultsWithApys,
  extractAssetAddresses,
  fetchVaultApys,
  parseVaultData,
  resolveCachedVaults,
  type VaultData,
  vaultContracts
} from '@/lib/dynavault'

export type { VaultData }

type ApyMap = Record<string, number | null>
const emptyApys: ApyMap = {}

interface UseVaultDataResult {
  vaults: VaultData[]
  isLoading: boolean
  error: Error | null
  cacheExpiresAt: number | null
}

export function useVaultData(): UseVaultDataResult {
  const publicClient = usePublicClient()
  const [initialCache] = useState(() => getCachedVaultData())
  const cachedVaults = initialCache?.data ?? null
  const [cacheExpiresAt, setCacheExpiresAt] = useState<number | null>(
    initialCache?.expiresAt ?? null
  )

  const {
    data: vaultResults,
    isLoading: isVaultLoading,
    error: vaultError
  } = useReadContracts({
    contracts: vaultContracts,
    query: { staleTime: 60000, refetchInterval: false }
  }) as {
    data: ContractResult[] | undefined
    isLoading: boolean
    error: Error | null
  }

  const assetAddresses = useMemo(
    () => extractAssetAddresses(vaultResults),
    [vaultResults]
  )

  const assetContracts = useMemo(
    () =>
      assetAddresses.flatMap((address) => [
        { address, abi: erc20Abi, functionName: 'symbol' as const },
        { address, abi: erc20Abi, functionName: 'decimals' as const }
      ]),
    [assetAddresses]
  )

  const {
    data: assetResults,
    isLoading: isAssetLoading,
    error: assetError
  } = useReadContracts({
    contracts: assetContracts,
    query: {
      enabled: assetAddresses.length > 0,
      staleTime: 60000,
      refetchInterval: false
    }
  }) as {
    data: ContractResult[] | undefined
    isLoading: boolean
    error: Error | null
  }

  const baseVaults = useMemo(
    () => parseVaultData(vaultResults, assetResults),
    [vaultResults, assetResults]
  )

  const resolvedVaults = useMemo(
    () => resolveCachedVaults(baseVaults, cachedVaults),
    [baseVaults, cachedVaults]
  )

  // Fetch native APYs
  const { data: apys } = useQuery<ApyMap>({
    queryKey: ['vaultApys', VAULT_ADDRESSES.join(',')],
    queryFn: () => {
      if (!publicClient) return emptyApys
      return fetchVaultApys(publicClient, VAULT_ADDRESSES)
    },
    enabled: !!publicClient,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  const vaults = useMemo(
    () => enrichVaultsWithApys(resolvedVaults, apys ?? emptyApys),
    [resolvedVaults, apys]
  )

  // Cache vaults with all data
  useEffect(() => {
    if (vaults.length > 0 && vaults.some((v) => v.apy !== null)) {
      setCachedVaultData(vaults)
      setCacheExpiresAt(Date.now() + VAULT_CACHE_TTL)
    }
  }, [vaults])

  return {
    vaults,
    isLoading: (isVaultLoading || isAssetLoading) && vaults.length === 0,
    error: vaultError || assetError,
    cacheExpiresAt
  }
}
