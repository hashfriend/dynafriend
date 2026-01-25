import type { Address } from 'viem'

const DEFILLAMA_API = 'https://coins.llama.fi/prices/current'

/**
 * Fetch multiple token prices from DeFiLlama
 */
export async function fetchPrices(
  addresses: Address[]
): Promise<Record<string, number>> {
  if (addresses.length === 0) return {}

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
