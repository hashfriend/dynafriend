import { useEffect, useMemo, useState } from 'react'
import type { UserPosition } from '../../hooks/useUserPositions'
import { calculateApyFromUsd } from '../../lib/apy'
import { toUsdValue } from '../../lib/convert'

interface UseSummaryDataParams {
  positions: UserPosition[]
  prices: Record<string, number>
  cacheExpiresAt: number | null
}

export function useSummaryData({
  positions,
  prices,
  cacheExpiresAt
}: UseSummaryDataParams) {
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (!cacheExpiresAt) return

    const update = () => {
      const remaining = cacheExpiresAt - Date.now()
      setTimeRemaining(Math.max(0, remaining))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [cacheExpiresAt])

  const { totalValue, totalProfit, profitReady, portfolioApy } = useMemo(() => {
    let value = 0
    let profit = 0
    let allProfitsReady = true
    const allCashFlows: { amount: number; timestamp: number }[] = []

    for (const position of positions) {
      const price = prices[position.vaultData.assetAddress.toLowerCase()]
      if (!price) continue

      value += toUsdValue(
        position.currentValue,
        position.vaultData.assetDecimals,
        price
      )

      if (position.profit !== null) {
        profit += toUsdValue(
          position.profit,
          position.vaultData.assetDecimals,
          price
        )
      } else {
        allProfitsReady = false
      }

      for (const cf of position.cashFlows) {
        allCashFlows.push({
          amount:
            (Number(cf.amount) / 10 ** position.vaultData.assetDecimals) *
            price,
          timestamp: cf.timestamp
        })
      }
    }

    return {
      totalValue: value,
      totalProfit: profit,
      profitReady: allProfitsReady,
      portfolioApy: calculateApyFromUsd(allCashFlows, value)
    }
  }, [positions, prices])

  return {
    totalValue,
    totalProfit,
    profitReady,
    portfolioApy,
    timeRemaining,
    isCacheActive: Boolean(cacheExpiresAt && timeRemaining > 0)
  }
}
