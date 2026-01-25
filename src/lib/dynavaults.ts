import type { Address, PublicClient, Transport } from 'viem'
import type { base } from 'viem/chains'
import { dynavaultAbi } from '@/abi/dynavault'
import { erc20Abi } from '@/abi/erc20'
import { VAULT_ADDRESSES, VAULTS } from '@/config/vaults'

/** Base has ~2 second blocks, 24h = 43200 blocks */
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

/**
 * Fetch all vault data from chain
 */
export async function fetchVaults(
  client: PublicClient<Transport, typeof base>
): Promise<VaultData[]> {
  const currentBlock = await client.getBlockNumber()
  const historicalBlock = currentBlock - BLOCKS_PER_DAY

  // Batch fetch vault data and current prices
  const vaultResults = await client.multicall({
    contracts: buildVaultCalls(VAULT_ADDRESSES)
  })

  // Batch fetch historical prices
  const historicalResults = await client.multicall({
    contracts: buildHistoricalCalls(VAULT_ADDRESSES),
    blockNumber: historicalBlock
  })

  // Extract asset addresses and batch fetch asset metadata
  const assetAddresses = extractAssetAddresses(
    vaultResults,
    VAULT_ADDRESSES.length
  )
  const assetResults = await client.multicall({
    contracts: buildAssetCalls(assetAddresses)
  })

  return parseVaultResults(vaultResults, historicalResults, assetResults)
}

/**
 * Calculate projected APY from 24h share price change.
 * This matches the Singularity Finance's DynaVaults frontend calculation.
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

/** Build vault contract calls for multicall */
function buildVaultCalls(addresses: Address[]) {
  return addresses.flatMap((address) => [
    { address, abi: dynavaultAbi, functionName: 'name' as const },
    { address, abi: dynavaultAbi, functionName: 'symbol' as const },
    { address, abi: dynavaultAbi, functionName: 'decimals' as const },
    { address, abi: dynavaultAbi, functionName: 'asset' as const },
    { address, abi: dynavaultAbi, functionName: 'totalAssets' as const },
    { address, abi: dynavaultAbi, functionName: 'totalSupply' as const },
    { address, abi: dynavaultAbi, functionName: 'pricePerShare' as const }
  ])
}

/** Build historical price calls for multicall */
function buildHistoricalCalls(addresses: Address[]) {
  return addresses.map((address) => ({
    address,
    abi: dynavaultAbi,
    functionName: 'pricePerShare' as const
  }))
}

/** Build asset metadata calls for multicall */
function buildAssetCalls(addresses: Address[]) {
  return addresses.flatMap((address) => [
    { address, abi: erc20Abi, functionName: 'symbol' as const },
    { address, abi: erc20Abi, functionName: 'decimals' as const }
  ])
}

/** Extract asset addresses from vault multicall results */
function extractAssetAddresses(
  vaultResults: ContractResult[],
  vaultCount: number
): Address[] {
  const addresses: Address[] = []
  for (let i = 0; i < vaultCount; i++) {
    const assetResult = vaultResults[i * 7 + 3]
    if (assetResult.status === 'success') {
      addresses.push(assetResult.result as Address)
    }
  }
  return addresses
}

/** Parse multicall results into VaultData array */
function parseVaultResults(
  vaultResults: ContractResult[],
  historicalResults: ContractResult[],
  assetResults: ContractResult[]
): VaultData[] {
  const vaults: VaultData[] = []

  for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
    const offset = i * 7
    const nameResult = vaultResults[offset]
    const symbolResult = vaultResults[offset + 1]
    const decimalsResult = vaultResults[offset + 2]
    const assetResult = vaultResults[offset + 3]
    const totalAssetsResult = vaultResults[offset + 4]
    const totalSupplyResult = vaultResults[offset + 5]
    const currentPriceResult = vaultResults[offset + 6]
    const historicalPriceResult = historicalResults[i]
    const assetSymbolResult = assetResults[i * 2]
    const assetDecimalsResult = assetResults[i * 2 + 1]

    if (
      nameResult.status === 'success' &&
      symbolResult.status === 'success' &&
      decimalsResult.status === 'success' &&
      assetResult.status === 'success' &&
      totalAssetsResult.status === 'success' &&
      totalSupplyResult.status === 'success' &&
      assetSymbolResult.status === 'success' &&
      assetDecimalsResult.status === 'success'
    ) {
      const currentPrice =
        currentPriceResult.status === 'success'
          ? (currentPriceResult.result as bigint)
          : 0n
      const historicalPrice =
        historicalPriceResult.status === 'success'
          ? (historicalPriceResult.result as bigint)
          : 0n

      vaults.push({
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
        apy: calculateProjectedApy(currentPrice, historicalPrice)
      })
    }
  }

  return vaults
}

/** BigInt-aware JSON encoder for localStorage persistence */
export interface CachedVaults {
  data: VaultData[]
  cachedAt: number
}

export const vaultsEncoder = {
  encode: (value: CachedVaults | null): string =>
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  decode: (str: string): CachedVaults | null => {
    const parsed = JSON.parse(str)
    if (!parsed?.data) return null
    return {
      cachedAt: parsed.cachedAt,
      data: parsed.data.map((v: Record<string, unknown>) => ({
        ...v,
        address: v.address as Address,
        assetAddress: v.assetAddress as Address,
        totalAssets: BigInt(v.totalAssets as string),
        totalSupply: BigInt(v.totalSupply as string)
      }))
    }
  }
}
