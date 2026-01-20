import { useEffect, useMemo, useState } from 'react'
import { useConnection } from 'wagmi'
import type { UserPosition } from '../../hooks/useUserPositions'
import { formatUsd, toUsdValue } from '../../lib/calculations'
import styles from './PortfolioSummary.module.css'

interface PortfolioSummaryProps {
  positions: UserPosition[]
  isLoading: boolean
  prices: Record<string, number>
  cacheExpiresAt: number | null
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

  const { totalValue, totalProfit, profitReady } = useMemo(() => {
    let value = 0
    let profit = 0
    let allProfitsReady = true

    for (const position of positions) {
      const price = prices[position.vaultData.assetAddress.toLowerCase()]
      if (price) {
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
      }
    }

    return {
      totalValue: value,
      totalProfit: profit,
      profitReady: allProfitsReady
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
            <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
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
            <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
          ) : (
            <span className={styles.valueMuted}>—</span>
          )}
        </div>
      </div>
      {showCache && (
        <div className={styles.cache}>
          profit cached · {formatTimeRemaining(timeRemaining)}
        </div>
      )}
    </div>
  )
}
