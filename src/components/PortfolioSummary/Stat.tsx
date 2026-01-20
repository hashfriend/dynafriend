import type { ReactNode } from 'react'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './Stat.module.css'

interface StatProps {
  label: ReactNode
  value: string | null
  isLoading: boolean
  isProfit?: boolean
}

export function Stat({ label, value, isLoading, isProfit }: StatProps) {
  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      {isLoading ? (
        <Skeleton variant="valueLg" />
      ) : value !== null ? (
        <span className={`${styles.value} ${isProfit ? styles.profit : ''}`}>
          {value}
        </span>
      ) : (
        <span className={styles.valueMuted}>—</span>
      )}
    </div>
  )
}
