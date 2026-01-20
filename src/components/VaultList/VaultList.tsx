import { useMemo } from 'react'
import { VAULT_ADDRESSES } from '../../config/vaults'
import { useTokenPrices } from '../../hooks/useTokenPrices'
import { useUserPositions } from '../../hooks/useUserPositions'
import { useVaultData } from '../../hooks/useVaultData'
import { toUsdValue } from '../../lib/convert'
import { Skeleton } from '../Skeleton/Skeleton'
import { VaultCard } from './VaultCard'
import cardStyles from './VaultCard.module.css'
import styles from './VaultList.module.css'

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

export function VaultList() {
  const { vaults, isLoading, error } = useVaultData()

  const assetAddresses = useMemo(
    () => vaults.map((v) => v.assetAddress),
    [vaults]
  )

  const { prices } = useTokenPrices(assetAddresses)
  const { positions } = useUserPositions(vaults)

  const positionsByVault = new Map(positions.map((p) => [p.vaultAddress, p]))

  const sortedVaults = useMemo(() => {
    return [...vaults].sort((a, b) => {
      const priceA = prices[a.assetAddress.toLowerCase()] ?? 0
      const priceB = prices[b.assetAddress.toLowerCase()] ?? 0
      const tvlA = toUsdValue(a.totalAssets, a.assetDecimals, priceA)
      const tvlB = toUsdValue(b.totalAssets, b.assetDecimals, priceB)
      return tvlB - tvlA
    })
  }, [vaults, prices])

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
        {sortedVaults.map((vault) => (
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
