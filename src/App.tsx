import { useMemo } from 'react'
import styles from './App.module.css'
import { ConnectButton } from './components/ConnectButton/ConnectButton'
import { PortfolioSummary } from './components/PortfolioSummary/PortfolioSummary'
import { VaultList } from './components/VaultList/VaultList'
import { useTokenPrices } from './hooks/useTokenPrices'
import { useUserPositions } from './hooks/useUserPositions'
import { useVaultData } from './hooks/useVaultData'

export function App() {
  const {
    vaults,
    isLoading: isVaultsLoading,
    error: vaultsError
  } = useVaultData()

  const assetAddresses = useMemo(
    () => vaults.map((v) => v.assetAddress),
    [vaults]
  )

  const { prices } = useTokenPrices(assetAddresses)

  const {
    positions,
    isLoading: isPositionsLoading,
    cacheExpiresAt
  } = useUserPositions(vaults)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>DynaFriend</h1>
        <ConnectButton />
      </header>
      <main className={styles.main}>
        <PortfolioSummary
          positions={positions}
          isLoading={isPositionsLoading}
          prices={prices}
          cacheExpiresAt={cacheExpiresAt}
        />
        <VaultList
          vaults={vaults}
          positions={positions}
          isLoading={isVaultsLoading}
          error={vaultsError}
          prices={prices}
        />
      </main>
      <footer className={styles.footer}>
        <p>
          Powered by{' '}
          <a
            href="https://www.singularityfinance.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Singularity Finance
          </a>
        </p>
      </footer>
    </div>
  )
}
