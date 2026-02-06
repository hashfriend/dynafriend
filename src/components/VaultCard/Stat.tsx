import type { JSX, ReactNode } from 'react'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './Stat.module.css'

type Variant = 'default' | 'muted' | 'profit'

interface StatProps {
  label: string
  value: ReactNode
  variant?: Variant
  isLoading?: boolean
  hidden?: boolean
  onClick?: () => void
}

export function Stat({
  label,
  value,
  variant = 'default',
  isLoading = false,
  hidden = false,
  onClick
}: StatProps): JSX.Element {
  const valueClass =
    variant === 'default' ? styles.value : `${styles.value} ${styles[variant]}`

  const isClickable = !!onClick

  return (
    <div
      className={styles.stat}
      style={hidden ? { visibility: 'hidden' } : undefined}
    >
      <span className={styles.label}>{label}</span>
      {isClickable ? (
        <button
          type="button"
          className={`${valueClass} ${styles.clickable}`}
          onClick={onClick}
        >
          {isLoading ? <Skeleton variant="value" /> : value}
        </button>
      ) : (
        <span className={valueClass}>
          {isLoading ? <Skeleton variant="value" /> : value}
        </span>
      )}
    </div>
  )
}
