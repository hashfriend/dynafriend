import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { useAccount } from 'wagmi'
import { InfoTooltip } from '@/components/InfoTooltip/InfoTooltip'
import { useCacheTimer } from '@/hooks/useCacheTimer'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useUserData } from '@/hooks/useUserData'
import { formatApy, formatTimeRemaining, formatUsd } from '@/lib/format'
import { cycleYieldPeriod } from '@/stores/preferences'
import { $isPrivate, HIDDEN_VALUE } from '@/stores/privacy'
import styles from './PortfolioSummary.module.css'
import { Stat } from './Stat'

const PERIOD_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly'
} as const

export function PortfolioSummary(): JSX.Element {
  const isPrivate = useStore($isPrivate)
  const { status } = useAccount()
  const isConnected = status === 'connected'

  const { positions, summary } = usePortfolio()
  const { isLoading: userLoading, eventsCacheExpiresAt } = useUserData()
  const {
    totalValue,
    totalProfit,
    profitReady,
    portfolioApy,
    estimatedYield,
    yieldPeriod
  } = summary
  const { timeRemaining, isFresh } = useCacheTimer(eventsCacheExpiresAt)

  const hasData = isConnected && positions.length > 0
  const showSkeleton = isConnected && userLoading && positions.length === 0

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <Stat
          label="Active Positions"
          value={
            hasData ? (isPrivate ? HIDDEN_VALUE : formatUsd(totalValue)) : null
          }
          isLoading={showSkeleton}
        />

        <Stat
          label={
            <>
              Est.{' '}
              <button
                type="button"
                className={styles.periodToggle}
                onClick={cycleYieldPeriod}
              >
                {PERIOD_LABELS[yieldPeriod]}
              </button>{' '}
              Yield
              <InfoTooltip>
                Projected using the vault's 24-hour APY, weighted by your active
                position value in each vault.
              </InfoTooltip>
            </>
          }
          value={
            hasData && estimatedYield !== null
              ? isPrivate
                ? HIDDEN_VALUE
                : formatUsd(estimatedYield)
              : null
          }
          isLoading={showSkeleton}
          isProfit
        />

        <Stat
          label={
            <>
              Total Yield
              <InfoTooltip>
                Combined yield across all vaults with active positions.
                {isConnected &&
                  isFresh &&
                  ` Underlying transaction data cached for ${formatTimeRemaining(timeRemaining)} min.`}
              </InfoTooltip>
            </>
          }
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
                Calculated using XIRR, weighting each deposit and withdrawal by
                time.
                {isConnected &&
                  isFresh &&
                  ` Underlying transaction data cached for ${formatTimeRemaining(timeRemaining)} min.`}
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
