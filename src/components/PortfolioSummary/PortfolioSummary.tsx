import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { useConnection } from 'wagmi'
import { InfoTooltip } from '@/components/InfoTooltip/InfoTooltip'
import { useCacheTimer } from '@/hooks/useCacheTimer'
import { formatApy, formatTimeRemaining, formatUsd } from '@/lib/format'
import { $positions, $summary } from '@/stores/portfolio'
import { $isPrivate, HIDDEN_VALUE } from '@/stores/privacy'
import { $eventsCacheExpiresAt, $userDataLoading } from '@/stores/user-data'
import styles from './PortfolioSummary.module.css'
import { Stat } from './Stat'

export function PortfolioSummary(): JSX.Element {
  const isPrivate = useStore($isPrivate)
  const { status } = useConnection()
  const isConnected = status === 'connected'

  const positions = useStore($positions)
  const isLoading = useStore($userDataLoading)
  const { totalValue, totalProfit, profitReady, portfolioApy } =
    useStore($summary)
  const eventsCacheExpiresAt = useStore($eventsCacheExpiresAt)
  const { timeRemaining, isFresh, isStale } =
    useCacheTimer(eventsCacheExpiresAt)

  const hasData = isConnected && positions.length > 0
  const showSkeleton = isConnected && isLoading && positions.length === 0
  const estimatedDailyYield =
    portfolioApy !== null ? (totalValue * portfolioApy) / 100 / 365 : null

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <Stat
          label="All Positions"
          value={
            hasData ? (isPrivate ? HIDDEN_VALUE : formatUsd(totalValue)) : null
          }
          isLoading={showSkeleton}
        />
        <Stat
          label="Total Yield"
          value={
            hasData && profitReady
              ? isPrivate
                ? HIDDEN_VALUE
                : formatUsd(totalProfit)
              : null
          }
          isLoading={showSkeleton}
          isProfit
        />
        <Stat
          label="Est. Daily Yield"
          value={
            hasData && estimatedDailyYield !== null
              ? isPrivate
                ? HIDDEN_VALUE
                : formatUsd(estimatedDailyYield)
              : null
          }
          isLoading={showSkeleton}
          isProfit
        />
        <Stat
          label={
            <>
              Total APY
              <InfoTooltip title="Your Personal Total APY">
                Calculated using XIRR, weighting each deposit and withdrawal by
                time.
                {isConnected &&
                  isFresh &&
                  ` Underlying transaction data cached for ${formatTimeRemaining(timeRemaining)} min.`}
                {isConnected && isStale && ' Refreshing transaction data...'}
              </InfoTooltip>
            </>
          }
          value={
            hasData && portfolioApy !== null ? formatApy(portfolioApy) : null
          }
          isLoading={showSkeleton}
        />
      </div>
    </div>
  )
}
