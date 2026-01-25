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
  const { timeRemaining, isCacheActive } = useCacheTimer(eventsCacheExpiresAt)

  const hasData = isConnected && positions.length > 0
  const showSkeleton = isConnected && isLoading && positions.length === 0

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
          label="Total Profit"
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
          label={
            <>
              Total APY
              <InfoTooltip title="Your Personal Total APY">
                Calculated using XIRR (Extended Internal Rate of Return),
                weighting each deposit and withdrawal by time.
                {isConnected &&
                  isCacheActive &&
                  ` Underlying transaction data cached for ${formatTimeRemaining(timeRemaining)} min.`}
              </InfoTooltip>
            </>
          }
          value={
            hasData && portfolioApy !== null ? formatApy(portfolioApy) : null
          }
          isLoading={showSkeleton}
          isProfit
        />
      </div>
    </div>
  )
}
