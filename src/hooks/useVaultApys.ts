import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { usePublicClient } from 'wagmi'
import { dynavaultAbi } from '@/abi/dynavault'

// Base has ~2 second blocks, 24h = 43200 blocks
const BLOCKS_PER_DAY = 43200n

/**
 * Calculate projected APY from 24h share price change
 * Formula: ((1 + dailyChange) ** 365 - 1) * 100
 */
function calculateProjectedApy(
  currentPrice: bigint,
  historicalPrice: bigint
): number | null {
  if (historicalPrice === 0n) return null
  if (currentPrice === 0n) return null

  const currentNum = Number(currentPrice)
  const historicalNum = Number(historicalPrice)

  const dailyChange = (currentNum - historicalNum) / historicalNum
  if (dailyChange < 0) return 0

  const apy = ((1 + dailyChange) ** 365 - 1) * 100
  return apy
}

export function useVaultApys(vaultAddresses: Address[]) {
  const publicClient = usePublicClient()

  const { data, isLoading } = useQuery({
    queryKey: ['vaultApys', vaultAddresses.join(',')],
    queryFn: async () => {
      if (!publicClient) return {}

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
    },
    enabled: vaultAddresses.length > 0 && !!publicClient,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  })

  return {
    apys: data ?? {},
    isLoading
  }
}
