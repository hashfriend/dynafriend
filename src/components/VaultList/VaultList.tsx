import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { SkeletonCard, VaultCard } from '@/components/VaultCard'
import { VAULT_ADDRESSES } from '@/config/vaults'
import { useCacheTimer } from '@/hooks/useCacheTimer'
import { toUsdValue } from '@/lib/convert'
import { formatTimeRemaining } from '@/lib/format'
import { $positions } from '@/stores/portfolio'
import { $vaultData, $vaultsCacheExpiresAt } from '@/stores/vault-data'
import styles from './VaultList.module.css'

export function VaultList(): JSX.Element {
  const { data, loading: isLoading, error } = useStore($vaultData)
  const vaults = data?.vaults ?? []
  const prices = data?.prices ?? {}
  const positions = useStore($positions)
  const cacheExpiresAt = useStore($vaultsCacheExpiresAt)
  const { timeRemaining, isCacheActive } = useCacheTimer(cacheExpiresAt)

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

  if (isLoading && vaults.length === 0) {
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
      {isCacheActive && (
        <div className={styles.footer}>
          Vault data cached for {formatTimeRemaining(timeRemaining)} min.
          <br />
          Profit data automatically refreshed at least every 30 seconds.
        </div>
      )}
    </div>
  )
}
