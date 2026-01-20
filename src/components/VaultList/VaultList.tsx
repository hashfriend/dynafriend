import { VAULT_ADDRESSES } from '../../config/vaults'
import type { UserPosition } from '../../hooks/useUserPositions'
import type { VaultData } from '../../hooks/useVaultData'
import { Skeleton } from '../Skeleton/Skeleton'
import { VaultCard } from './VaultCard'
import cardStyles from './VaultCard.module.css'
import styles from './VaultList.module.css'

interface VaultListProps {
  vaults: VaultData[]
  positions: UserPosition[]
  isLoading: boolean
  error: Error | null
  prices: Record<string, number>
}

function SkeletonCard() {
  return (
    <div className={cardStyles.card}>
      <div className={cardStyles.header}>
        <Skeleton variant="textWide" />
        <Skeleton variant="text" />
      </div>
      <div className={cardStyles.body}>
        <div className={cardStyles.stat}>
          <span className={cardStyles.statLabel}>Asset</span>
          <Skeleton variant="value" />
        </div>
        <div className={cardStyles.stat}>
          <span className={cardStyles.statLabel}>TVL</span>
          <Skeleton variant="value" />
        </div>
      </div>
    </div>
  )
}

export function VaultList({
  vaults,
  positions,
  isLoading,
  error,
  prices
}: VaultListProps) {
  const positionsByVault = new Map(positions.map((p) => [p.vaultAddress, p]))

  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>DynaVaults</h2>
        <div className={styles.error}>
          Error loading vaults: {error.message}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>DynaVaults</h2>
        <div className={styles.grid}>
          {VAULT_ADDRESSES.map((addr) => (
            <SkeletonCard key={addr} />
          ))}
        </div>
      </div>
    )
  }

  if (vaults.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>DynaVaults</h2>
        <div className={styles.empty}>No vaults found</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>DynaVaults</h2>
      <div className={styles.grid}>
        {vaults.map((vault) => (
          <VaultCard
            key={vault.address}
            vault={vault}
            price={prices[vault.assetAddress.toLowerCase()]}
            position={positionsByVault.get(vault.address)}
          />
        ))}
      </div>
    </div>
  )
}
