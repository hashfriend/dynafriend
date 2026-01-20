import { useEffect, useMemo, useState } from 'react'
import { useConnection } from 'wagmi'
import type { UserPosition } from '../../hooks/useUserPositions'
import { toUsdValue } from '../../lib/calculations'
import { formatApy, formatTimeRemaining, formatUsd } from '../../lib/format'
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
    let netInvestedInPositions = 0
    let allProfitsReady = true
    let earliestPositionStart: number | null = null

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
        // For APY: use net invested in current position
        const netInvested =
          position.depositedInPosition - position.withdrawnInPosition
        if (netInvested > 0n) {
          netInvestedInPositions += toUsdValue(
            netInvested,
            position.vaultData.assetDecimals,
            price
          )
        }
        if (
          position.positionStartTime !== null &&
          (earliestPositionStart === null ||
            position.positionStartTime < earliestPositionStart)
        ) {
          earliestPositionStart = position.positionStartTime
        }
      }
    }

    // Calculate portfolio APY based on current positions
    let apy: number | null = null
    if (netInvestedInPositions > 0 && earliestPositionStart !== null) {
      const now = Math.floor(Date.now() / 1000)
      const holdingPeriodDays = (now - earliestPositionStart) / 86400
      if (holdingPeriodDays > 0) {
        const positionProfit = value - netInvestedInPositions
        const returnRate = positionProfit / netInvestedInPositions
        apy = ((1 + returnRate) ** (365 / holdingPeriodDays) - 1) * 100
      }
    }

    return {
      totalValue: value,
      totalProfit: profit,
      profitReady: allProfitsReady,
      portfolioApy: apy
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
        <div className={styles.stat}>
          <span className={styles.label}>APY</span>
          {hasData ? (
            <span className={`${styles.value} ${styles.profit}`}>
              {portfolioApy !== null ? formatApy(portfolioApy) : '—'}
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
          profit data cached · {formatTimeRemaining(timeRemaining)}
        </div>
      )}
    </div>
  )
}
