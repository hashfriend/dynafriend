import type { ReactNode } from 'react'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './Stat.module.css'

type Variant = 'default' | 'muted' | 'profit'

interface StatProps {
  label: string
  value: ReactNode
  variant?: Variant
  isLoading?: boolean
}

export function Stat({
  label,
  value,
  variant = 'default',
  isLoading = false
}: StatProps) {
  const valueClass =
    variant === 'default' ? styles.value : `${styles.value} ${styles[variant]}`

  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={valueClass}>
        {isLoading ? <Skeleton variant="value" /> : value}
      </span>
    </div>
  )
}
