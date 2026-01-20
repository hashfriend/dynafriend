import { useMemo } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { dynavaultAbi } from '@/abi/dynavault'
import { erc20Abi } from '@/abi/erc20'
import { VAULT_ADDRESSES, VAULTS } from '@/config/vaults'

type ContractResult =
  | { status: 'success'; result: unknown }
  | { status: 'failure'; error: Error }

export interface VaultData {
  address: Address
  name: string
  symbol: string
  decimals: number
  assetAddress: Address
  assetSymbol: string
  assetDecimals: number
  totalAssets: bigint
  totalSupply: bigint
  externalUrl: string
}

// Static contracts - defined outside component to prevent recreation
const vaultContracts = VAULT_ADDRESSES.flatMap((address) => [
  { address, abi: dynavaultAbi, functionName: 'name' as const },
  { address, abi: dynavaultAbi, functionName: 'symbol' as const },
  { address, abi: dynavaultAbi, functionName: 'decimals' as const },
  { address, abi: dynavaultAbi, functionName: 'asset' as const },
  { address, abi: dynavaultAbi, functionName: 'totalAssets' as const },
  { address, abi: dynavaultAbi, functionName: 'totalSupply' as const }
])

export function useVaultData() {
  const {
    data: vaultResults,
    isLoading: isVaultLoading,
    error: vaultError
  } = useReadContracts({
    contracts: vaultContracts,
    query: {
      staleTime: 60000,
      refetchInterval: false
    }
  }) as {
    data: ContractResult[] | undefined
    isLoading: boolean
    error: Error | null
  }

  // Extract asset addresses from vault results
  const assetAddresses = useMemo(() => {
    const addresses: Address[] = []
    if (!vaultResults) return addresses

    for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
      const assetResult = vaultResults[i * 6 + 3]
      if (assetResult?.status === 'success') {
        addresses.push(assetResult.result as Address)
      }
    }
    return addresses
  }, [vaultResults])

  // Memoize asset contracts
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

  // Memoize combined vault data
  const vaults = useMemo(() => {
    const result: VaultData[] = []
    if (!vaultResults || !assetResults) return result

    for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
      const nameResult = vaultResults[i * 6]
      const symbolResult = vaultResults[i * 6 + 1]
      const decimalsResult = vaultResults[i * 6 + 2]
      const assetResult = vaultResults[i * 6 + 3]
      const totalAssetsResult = vaultResults[i * 6 + 4]
      const totalSupplyResult = vaultResults[i * 6 + 5]

      const assetSymbolResult = assetResults[i * 2]
      const assetDecimalsResult = assetResults[i * 2 + 1]

      if (
        nameResult?.status === 'success' &&
        symbolResult?.status === 'success' &&
        decimalsResult?.status === 'success' &&
        assetResult?.status === 'success' &&
        totalAssetsResult?.status === 'success' &&
        totalSupplyResult?.status === 'success' &&
        assetSymbolResult?.status === 'success' &&
        assetDecimalsResult?.status === 'success'
      ) {
        result.push({
          address: VAULT_ADDRESSES[i],
          name: nameResult.result as string,
          symbol: symbolResult.result as string,
          decimals: decimalsResult.result as number,
          assetAddress: assetResult.result as Address,
          assetSymbol: assetSymbolResult.result as string,
          assetDecimals: assetDecimalsResult.result as number,
          totalAssets: totalAssetsResult.result as bigint,
          totalSupply: totalSupplyResult.result as bigint,
          externalUrl: VAULTS[i].externalUrl
        })
      }
    }
    return result
  }, [vaultResults, assetResults])

  return {
    vaults,
    isLoading: isVaultLoading || isAssetLoading,
    error: vaultError || assetError
  }
}
