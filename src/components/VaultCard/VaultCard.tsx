import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { useState } from 'react'
import { ChevronRightIcon, ExternalLinkIcon } from '@/components/icons'
import { TxList } from '@/components/VaultCard/TxList'
import { calculateApy } from '@/lib/apy'
import { toUsdValue } from '@/lib/convert'
import type { VaultData } from '@/lib/dynavaults'
import { formatApy, formatTokenAmount, formatUsd } from '@/lib/format'
import type { UserPosition } from '@/lib/positions'
import { $isPrivate, HIDDEN_VALUE } from '@/stores/privacy'
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
  const isPrivate = useStore($isPrivate)
  const [showNative, setShowNative] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const tvlUsd = price
    ? formatUsd(toUsdValue(vault.totalAssets, vault.assetDecimals, price))
    : '—'

  const hasPosition = !!position
  const isActive = hasPosition && position.shares > 0n
  const eventsLoading = hasPosition && position.profit === null
  const hasTxs = hasPosition && position.cashFlows.length > 0

  // Exited position with incomplete event data (missing deposits or withdrawals)
  const incompleteExit =
    hasPosition &&
    !isActive &&
    position.cashFlows.length > 0 &&
    (position.totalDeposited === 0n ||
      position.totalWithdrawn === 0n ||
      (position.profit !== null && position.profit < 0n))

  const toggleDisplay = () => setShowNative((prev) => !prev)
  const toggleExpand = () => setIsExpanded((prev) => !prev)

  const userValueUsd =
    position && price
      ? formatUsd(toUsdValue(position.currentValue, vault.assetDecimals, price))
      : null

  const userValueNative = position
    ? `${formatTokenAmount(position.currentValue, vault.assetDecimals, 4)} ${vault.assetSymbol}`
    : null

  const userProfitUsd =
    position && price && position.profit !== null
      ? formatUsd(toUsdValue(position.profit, vault.assetDecimals, price))
      : null

  const userProfitNative =
    position && position.profit !== null
      ? `${formatTokenAmount(position.profit, vault.assetDecimals, 4)} ${vault.assetSymbol}`
      : null

  const userApy =
    position && position.cashFlows.length > 0
      ? calculateApy(
          position.cashFlows,
          position.currentValue,
          vault.assetDecimals
        )
      : null

  return (
    <div className={`${styles.card} ${isActive ? styles.active : ''}`}>
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
            <h3 className={styles.symbol}>
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
                    isPrivate
                      ? HIDDEN_VALUE
                      : showNative
                        ? userValueNative
                        : (userValueUsd ?? userValueNative)
                  }
                  onClick={isPrivate || !price ? undefined : toggleDisplay}
                />
                <Stat
                  label="Total Yield"
                  value={
                    incompleteExit
                      ? '—'
                      : isPrivate
                        ? HIDDEN_VALUE
                        : showNative
                          ? userProfitNative
                          : (userProfitUsd ?? '—')
                  }
                  variant="profit"
                  isLoading={eventsLoading}
                  onClick={
                    incompleteExit || isPrivate || !price
                      ? undefined
                      : toggleDisplay
                  }
                />
                <Stat
                  label="Your APY"
                  value={
                    incompleteExit
                      ? '—'
                      : formatApy(userApy ?? 0)
                  }
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
