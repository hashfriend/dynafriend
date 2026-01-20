import { useConnection } from 'wagmi'
import type { UserPosition } from '../../hooks/useUserPositions'
import { formatApy, formatTimeRemaining, formatUsd } from '../../lib/format'
import { InfoTooltip } from '../InfoTooltip/InfoTooltip'
import styles from './PortfolioSummary.module.css'
import { Stat } from './Stat'
import { useSummaryData } from './useSummaryData'

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

  const {
    totalValue,
    totalProfit,
    profitReady,
    portfolioApy,
    timeRemaining,
    isCacheActive
  } = useSummaryData({ positions, prices, cacheExpiresAt })

  const hasData = isConnected && !isLoading && positions.length > 0
  const showSkeleton = isConnected && (isLoading || positions.length === 0)

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <Stat
          label="Your Positions"
          value={hasData ? formatUsd(totalValue) : null}
          isLoading={showSkeleton}
        />
        <Stat
          label="Your Profit"
          value={hasData && profitReady ? formatUsd(totalProfit) : null}
          isLoading={showSkeleton}
          isProfit
        />
        <Stat
          label={
            <>
              Your APY
              <InfoTooltip title="Your Personal APY">
                Calculated using XIRR (Extended Internal Rate of Return), which
                weights each deposit and withdrawal by time.
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
