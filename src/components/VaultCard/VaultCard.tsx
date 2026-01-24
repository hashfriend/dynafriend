import type { JSX } from 'react'
import { useState } from 'react'
import { ChevronRightIcon, ExternalLinkIcon } from '@/components/icons'
import { TxList } from '@/components/VaultCard/TxList'
import type { VaultData } from '@/hooks/useVaultData'
import { calculateApy } from '@/lib/apy'
import { toUsdValue } from '@/lib/convert'
import { formatApy, formatTokenAmount, formatUsd } from '@/lib/format'
import type { UserPosition } from '@/lib/positions'
import { Stat } from './Stat'
import styles from './VaultCard.module.css'

interface VaultCardProps {
  vault: VaultData
  price?: number
  position?: UserPosition
}

export function VaultCard({
  vault,
  price,
  position
}: VaultCardProps): JSX.Element {
  const [showNative, setShowNative] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const tvlUsd = price
    ? formatUsd(toUsdValue(vault.totalAssets, vault.assetDecimals, price))
    : '—'

  const hasPosition = position && position.shares > 0n
  const eventsLoading = hasPosition && position.profit === null
  const hasTxs = hasPosition && position.cashFlows.length > 0

  const toggleDisplay = () => setShowNative((prev) => !prev)
  const toggleExpand = () => setIsExpanded((prev) => !prev)

  const userValueUsd =
    hasPosition && price
      ? formatUsd(toUsdValue(position.currentValue, vault.assetDecimals, price))
      : null

  const userValueNative = hasPosition
    ? `${formatTokenAmount(position.currentValue, vault.assetDecimals, 4)} ${vault.assetSymbol}`
    : null

  const userProfitUsd =
    hasPosition && price && position.profit !== null
      ? formatUsd(toUsdValue(position.profit, vault.assetDecimals, price))
      : null

  const userProfitNative =
    hasPosition && position.profit !== null
      ? `${formatTokenAmount(position.profit, vault.assetDecimals, 4)} ${vault.assetSymbol}`
      : null

  const userApy =
    hasPosition && position.cashFlows.length > 0
      ? calculateApy(
          position.cashFlows,
          position.currentValue,
          vault.assetDecimals
        )
      : null

  return (
    <div className={styles.card}>
      <div className={styles.main}>
        {hasTxs && (
          <button
            type="button"
            className={`${styles.caret} ${isExpanded ? styles.caretExpanded : ''}`}
            onClick={toggleExpand}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded ? 'Collapse transactions' : 'Expand transactions'
            }
          >
            <ChevronRightIcon />
          </button>
        )}
        <div className={styles.content}>
          <div className={styles.header}>
            <h3
              className={`${styles.symbol} ${hasPosition ? styles.hasPosition : ''}`}
            >
              <a
                href={vault.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {vault.symbol}
                <ExternalLinkIcon className={styles.externalIcon} />
              </a>
            </h3>
            <span className={styles.name}>{vault.name}</span>
          </div>
          <div className={styles.body}>
            {/* <Stat label="Asset" value={vault.assetSymbol} variant="muted" /> */}
            <Stat label="TVL" value={tvlUsd} variant="muted" />
            <Stat label="APY" value={formatApy(vault.apy)} variant="muted" />
            {hasPosition && (
              <>
                <Stat
                  label="Position"
                  value={
                    showNative
                      ? userValueNative
                      : (userValueUsd ?? userValueNative)
                  }
                  onClick={price ? toggleDisplay : undefined}
                />
                <Stat
                  label="Profit"
                  value={showNative ? userProfitNative : (userProfitUsd ?? '—')}
                  variant="profit"
                  isLoading={eventsLoading}
                  onClick={price ? toggleDisplay : undefined}
                />
                <Stat
                  label="Your APY"
                  value={formatApy(userApy ?? 0)}
                  variant="profit"
                  isLoading={eventsLoading}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {isExpanded && hasTxs && (
        <TxList
          cashFlows={position.cashFlows}
          assetDecimals={vault.assetDecimals}
          assetSymbol={vault.assetSymbol}
        />
      )}
    </div>
  )
}
