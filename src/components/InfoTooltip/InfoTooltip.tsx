import type { ReactNode } from 'react'
import styles from './InfoTooltip.module.css'

interface InfoTooltipProps {
  title: string
  children: ReactNode
}

export function InfoTooltip({ title, children }: InfoTooltipProps) {
  return (
    <button type="button" className={styles.trigger} aria-label={title}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.25em"
        height="1.25em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span className={styles.tooltip} role="tooltip">
        <span className={styles.title}>{title}</span>
        {children}
      </span>
    </button>
  )
}
