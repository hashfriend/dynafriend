import { useEffect, useMemo, useState } from 'react'
import { useConnection } from 'wagmi'
import type { UserPosition } from '../../hooks/useUserPositions'
import { calculateApyFromUsd } from '../../lib/apy'
import { toUsdValue } from '../../lib/convert'
import { formatApy, formatTimeRemaining, formatUsd } from '../../lib/format'
import { Skeleton } from '../Skeleton/Skeleton'
import styles from './PortfolioSummary.module.css'

interface PortfolioSummaryProps {
  positions: UserPosition[]
  isLoading: boolean
  prices: Record<string, number>
  cacheExpiresAt: number | null
}

export function PortfolioSummary({
  positions,
  isLoading,
  prices,
  cacheExpiresAt
}: PortfolioSummaryProps) {
  const { status } = useConnection()
  const isConnected = status === 'connected'
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

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
            (Number(cf.amount) / 10 ** position.vaultData.assetDecimals) * price,
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

  const showCache = isConnected && cacheExpiresAt && timeRemaining > 0
  const hasData = isConnected && !isLoading && positions.length > 0
  const showSkeleton = isConnected && (isLoading || positions.length === 0)

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Portfolio Value</span>
          {hasData ? (
            <span className={styles.value}>{formatUsd(totalValue)}</span>
          ) : showSkeleton ? (
            <Skeleton variant="valueLg" />
          ) : (
            <span className={styles.valueMuted}>—</span>
          )}
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Total Profit</span>
          {hasData ? (
            <span className={`${styles.value} ${styles.profit}`}>
              {profitReady ? formatUsd(totalProfit) : '—'}
            </span>
          ) : showSkeleton ? (
            <Skeleton variant="valueLg" />
          ) : (
            <span className={styles.valueMuted}>—</span>
          )}
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>APY</span>
          {hasData ? (
            <span className={`${styles.value} ${styles.profit}`}>
              {portfolioApy !== null ? formatApy(portfolioApy) : '—'}
            </span>
          ) : showSkeleton ? (
            <Skeleton variant="valueLg" />
          ) : (
            <span className={styles.valueMuted}>—</span>
          )}
        </div>
      </div>
      {showCache && (
        <div className={styles.cache}>
          profit data cached · {formatTimeRemaining(timeRemaining)}
        </div>
      )}
    </div>
  )
}
