import { useState } from 'react'
import type { UserPosition } from '@/hooks/useUserPositions'
import type { VaultData } from '@/hooks/useVaultData'
import { calculateApy } from '@/lib/apy'
import { toUsdValue } from '@/lib/convert'
import { formatApy, formatTokenAmount, formatUsd } from '@/lib/format'
import { Stat } from './Stat'
import styles from './VaultCard.module.css'

interface VaultCardProps {
  vault: VaultData
  price?: number
  position?: UserPosition
}

export function VaultCard({ vault, price, position }: VaultCardProps) {
  const [showNative, setShowNative] = useState(false)

  const tvlUsd = price
    ? formatUsd(toUsdValue(vault.totalAssets, vault.assetDecimals, price))
    : '—'

  const hasPosition = position && position.shares > 0n
  const eventsLoading = hasPosition && position.profit === null

  const toggleDisplay = () => setShowNative((prev) => !prev)

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
            <svg
              className={styles.externalIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </a>
        </h3>
        <span className={styles.name}>{vault.name}</span>
      </div>
      <div className={styles.body}>
        <Stat label="Asset" value={vault.assetSymbol} variant="muted" />
        <Stat label="TVL" value={tvlUsd} variant="muted" />
        {hasPosition && (
          <>
            <Stat
              label="Position"
              value={showNative ? userValueNative : (userValueUsd ?? userValueNative)}
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
              label="APY"
              value={formatApy(userApy ?? 0)}
              variant="profit"
              isLoading={eventsLoading}
            />
          </>
        )}
      </div>
    </div>
  )
}
