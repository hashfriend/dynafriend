import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { SkeletonCard, VaultCard } from '@/components/VaultCard'
import { VAULT_ADDRESSES } from '@/config/vaults'
import { useTokenPrices } from '@/hooks/useTokenPrices'
import { useUserPositions } from '@/hooks/useUserPositions'
import { useVaultData } from '@/hooks/useVaultData'
import { toUsdValue } from '@/lib/convert'
import { formatTimeRemaining } from '@/lib/format'
import styles from './VaultList.module.css'

export function VaultList(): JSX.Element {
  const { vaults, isLoading, error, cacheExpiresAt } = useVaultData()

  // Track time remaining for cache
  const [timeRemaining, setTimeRemaining] = useState(
    cacheExpiresAt ? cacheExpiresAt - Date.now() : 0
  )

  useEffect(() => {
    if (!cacheExpiresAt) return
    setTimeRemaining(cacheExpiresAt - Date.now())
    const interval = setInterval(() => {
      setTimeRemaining(cacheExpiresAt - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [cacheExpiresAt])

  const isCacheActive = cacheExpiresAt !== null && timeRemaining > 0

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
