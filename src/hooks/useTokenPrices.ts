import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'

const DEFILLAMA_API = 'https://coins.llama.fi/prices/current'

export function useTokenPrices(addresses: Address[]) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  const uniqueAddresses = useMemo(
    () => [...new Set(addresses.map((a) => a.toLowerCase()))],
    [addresses]
  )

  useEffect(() => {
    if (uniqueAddresses.length === 0) return

    const fetchPrices = async () => {
      setIsLoading(true)
      try {
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
        setPrices(priceMap)
      } catch (error) {
        console.error('Failed to fetch token prices:', error)
      }
      setIsLoading(false)
    }

    fetchPrices()
  }, [uniqueAddresses])

  return { prices, isLoading }
}
