import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { useConnection } from 'wagmi'
import { InfoTooltip } from '@/components/InfoTooltip/InfoTooltip'
import { useSummaryData } from '@/hooks/useSummaryData'
import { useTokenPrices } from '@/hooks/useTokenPrices'
import { useUserPositions } from '@/hooks/useUserPositions'
import { useVaultData } from '@/hooks/useVaultData'
import { formatApy, formatTimeRemaining, formatUsd } from '@/lib/format'
import { $isPrivate } from '@/stores/privacy'
import styles from './PortfolioSummary.module.css'
import { Stat } from './Stat'

const HIDDEN_VALUE = '*****'

export function PortfolioSummary(): JSX.Element {
  const isPrivate = useStore($isPrivate)
  const { status } = useConnection()
  const isConnected = status === 'connected'

  const { vaults } = useVaultData()

  const assetAddresses = useMemo(
    () => vaults.map((v) => v.assetAddress),
    [vaults]
  )

  const { prices } = useTokenPrices(assetAddresses)
  const { positions, isLoading, cacheExpiresAt } = useUserPositions(vaults)

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
