import type { JSX, ReactNode } from 'react'
import { InfoIcon } from '@/components/icons'
import styles from './InfoTooltip.module.css'

interface InfoTooltipProps {
  title: string
  children: ReactNode
}

export function InfoTooltip({
  title,
  children
}: InfoTooltipProps): JSX.Element {
  return (
    <button type="button" className={styles.trigger} aria-label={title}>
      <InfoIcon />
      <span className={styles.tooltip} role="tooltip">
        <span className={styles.title}>{title}</span>
        {children}
      </span>
    </button>
  )
}
