import type { JSX } from 'react'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@/components/ConnectButton/ConnectButton'
import { PortfolioSummary } from '@/components/PortfolioSummary/PortfolioSummary'
import { VaultList } from '@/components/VaultList/VaultList'
import { $userAddress } from '@/stores/user-data'
import styles from './App.module.css'
import { SINGULARITY_FINANCE_URL } from './config/vaults'

export function App(): JSX.Element {
  const { address } = useAccount()

  useEffect(() => {
    $userAddress.set(address ?? null)
  }, [address])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>DynaFriend</h1>
        <ConnectButton />
      </header>
      <main className={styles.main}>
        <PortfolioSummary />
        <VaultList />
      </main>
      <footer className={styles.footer}>
        <p>
          Created by{' '}
          <a href="https://hashfriend.eth.limo" target="_blank" rel="noopener">
            hashfriend.eth
          </a>
        </p>
        <p>
          Powered by{' '}
          <a href={SINGULARITY_FINANCE_URL} target="_blank" rel="noopener">
            Singularity Finance
          </a>
        </p>
      </footer>
    </div>
  )
}
