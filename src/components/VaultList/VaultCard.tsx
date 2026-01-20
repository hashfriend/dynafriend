import type { UserPosition } from '../../hooks/useUserPositions'
import type { VaultData } from '../../hooks/useVaultData'
import {
  formatTokenAmount,
  formatUsd,
  toUsdValue
} from '../../lib/calculations'
import styles from './VaultCard.module.css'

interface VaultCardProps {
  vault: VaultData
  price?: number
  position?: UserPosition
}

export function VaultCard({ vault, price, position }: VaultCardProps) {
  const tvlUsd = price
    ? formatUsd(toUsdValue(vault.totalAssets, vault.assetDecimals, price))
    : '—'

  const hasPosition = position && position.shares > 0n

  const userValue = hasPosition
    ? price
      ? formatUsd(toUsdValue(position.currentValue, vault.assetDecimals, price))
      : formatTokenAmount(position.currentValue, vault.assetDecimals, 4)
    : null

  const userProfit =
    hasPosition && price && position.profit !== null
      ? toUsdValue(position.profit, vault.assetDecimals, price)
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
        <div className={styles.stat}>
          <span className={styles.statLabel}>Asset</span>
          <span className={styles.statValue}>{vault.assetSymbol}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>TVL</span>
          <span className={styles.statValue}>{tvlUsd}</span>
        </div>
        {hasPosition && (
          <>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Your Position</span>
              <span className={styles.statValue}>{userValue}</span>
            </div>
            {userProfit !== null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Profit</span>
                <span className={`${styles.statValue} ${styles.profit}`}>
                  {formatUsd(userProfit)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
