import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './VaultCard.module.css'

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.main}>
        <div className={styles.content}>
          <div className={styles.header}>
            <Skeleton variant="textWide" />
            <Skeleton variant="text" />
          </div>
          <div className={styles.body}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Asset</span>
              <Skeleton variant="value" />
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>TVL</span>
              <Skeleton variant="value" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
