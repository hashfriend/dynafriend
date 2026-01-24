import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { EyeIcon, EyeOffIcon } from '@/components/icons'
import { $isPrivate, togglePrivacy } from '@/stores/privacy'
import styles from './PrivacyToggle.module.css'

export function PrivacyToggle(): JSX.Element {
  const isPrivate = useStore($isPrivate)

  return (
    <button
      type="button"
      className={styles.button}
      onClick={togglePrivacy}
      title={isPrivate ? 'Show values' : 'Hide values'}
      aria-pressed={isPrivate}
    >
      {isPrivate ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  )
}
