import type { Address, PublicClient } from 'viem'
import { dynavaultAbi } from '@/abi/dynavault'
import { VAULT_ADDRESSES, VAULTS } from '@/config/vaults'
import type { VaultDataCache } from '@/lib/cache-vaults'

// Base has ~2 second blocks, 24h = 43200 blocks
export const BLOCKS_PER_DAY = 43200n

export type ContractResult =
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
  apy: number | null
}

export const vaultContracts = VAULT_ADDRESSES.flatMap((address) => [
  { address, abi: dynavaultAbi, functionName: 'name' as const },
  { address, abi: dynavaultAbi, functionName: 'symbol' as const },
  { address, abi: dynavaultAbi, functionName: 'decimals' as const },
  { address, abi: dynavaultAbi, functionName: 'asset' as const },
  { address, abi: dynavaultAbi, functionName: 'totalAssets' as const },
  { address, abi: dynavaultAbi, functionName: 'totalSupply' as const }
])

/**
 * Calculate projected APY from 24h share price change
 * Formula: ((1 + dailyChange) ** 365 - 1) * 100
 */
export function calculateProjectedApy(
  currentPrice: bigint,
  historicalPrice: bigint
): number | null {
  if (historicalPrice === 0n || currentPrice === 0n) return null

  const currentNum = Number(currentPrice)
  const historicalNum = Number(historicalPrice)
  const dailyChange = (currentNum - historicalNum) / historicalNum

  if (dailyChange < 0) return 0
  return ((1 + dailyChange) ** 365 - 1) * 100
}

/**
 * Extract asset addresses from vault contract results
 */
export function extractAssetAddresses(
  vaultResults: ContractResult[] | undefined
): Address[] {
  if (!vaultResults) return []

  const addresses: Address[] = []
  for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
    const assetResult = vaultResults[i * 6 + 3]
    if (assetResult?.status === 'success') {
      addresses.push(assetResult.result as Address)
    }
  }
  return addresses
}

/**
 * Parse vault and asset contract results into VaultData array
 */
export function parseVaultData(
  vaultResults: ContractResult[] | undefined,
  assetResults: ContractResult[] | undefined
): VaultData[] {
  if (!vaultResults || !assetResults) return []

  const result: VaultData[] = []
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
        externalUrl: VAULTS[i].externalUrl,
        apy: null
      })
    }
  }
  return result
}

/**
 * Resolve cached vaults with proper Address types
 */
export function resolveCachedVaults(
  vaults: VaultData[],
  cachedVaults: VaultDataCache[] | null
): VaultData[] {
  if (vaults.length > 0) return vaults
  if (cachedVaults && cachedVaults.length > 0) {
    return cachedVaults.map((v) => ({
      ...v,
      address: v.address as Address,
      assetAddress: v.assetAddress as Address,
      apy: v.apy ?? null
    }))
  }
  return vaults
}

/**
 * Enrich vaults with APY data
 */
export function enrichVaultsWithApys(
  vaults: VaultData[],
  apys: Record<string, number | null>
): VaultData[] {
  return vaults.map((v) => ({
    ...v,
    apy: apys[v.address.toLowerCase()] ?? null
  }))
}

/**
 * Fetch projected APYs for all vaults
 */
export async function fetchVaultApys(
  publicClient: PublicClient,
  vaultAddresses: Address[]
): Promise<Record<string, number | null>> {
  const currentBlock = await publicClient.getBlockNumber()
  const historicalBlock = currentBlock - BLOCKS_PER_DAY

  const apys: Record<string, number | null> = {}

  for (const vault of vaultAddresses) {
    try {
      const [currentPrice, historicalPrice] = await Promise.all([
        publicClient.readContract({
          address: vault,
          abi: dynavaultAbi,
          functionName: 'pricePerShare'
        }),
        publicClient.readContract({
          address: vault,
          abi: dynavaultAbi,
          functionName: 'pricePerShare',
          blockNumber: historicalBlock
        })
      ])

      apys[vault.toLowerCase()] = calculateProjectedApy(
        currentPrice,
        historicalPrice
      )
    } catch {
      apys[vault.toLowerCase()] = null
    }
  }

  return apys
}
