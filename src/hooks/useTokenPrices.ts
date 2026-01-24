import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'

const DEFILLAMA_API = 'https://coins.llama.fi/prices/current'

async function fetchTokenPrices(
  addresses: Address[]
): Promise<Record<string, number>> {
  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))]
  const coins = uniqueAddresses.map((a) => `base:${a}`).join(',')
  const response = await fetch(`${DEFILLAMA_API}/${coins}`)
  const data = await response.json()

  const priceMap: Record<string, number> = {}
  for (const [key, coinData] of Object.entries(data.coins || {})) {
    const address = key.split(':')[1]?.toLowerCase()
    const price = (coinData as { price?: number })?.price
    if (address && price !== undefined) {
      priceMap[address] = price
    }
  }
  return priceMap
}

interface UseTokenPricesResult {
  prices: Record<string, number>
  isLoading: boolean
}

export function useTokenPrices(addresses: Address[]): UseTokenPricesResult {
  const sortedKey = [...addresses]
    .map((a) => a.toLowerCase())
    .sort()
    .join(',')

  const { data: prices = {}, isLoading } = useQuery({
    queryKey: ['tokenPrices', sortedKey],
    queryFn: () => fetchTokenPrices(addresses),
    enabled: addresses.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000
  })

  return { prices, isLoading }
}
