import { ConnectButton } from '@/components/ConnectButton/ConnectButton'
import { PortfolioSummary } from '@/components/PortfolioSummary/PortfolioSummary'
import { VaultList } from '@/components/VaultList/VaultList'
import styles from './App.module.css'

export function App() {
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
