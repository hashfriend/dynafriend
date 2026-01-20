import styles from './Skeleton.module.css'

type SkeletonVariant = 'text' | 'textWide' | 'value' | 'valueLg'

interface SkeletonProps {
  variant?: SkeletonVariant
}

export function Skeleton({ variant = 'text' }: SkeletonProps) {
  return <div className={`${styles.skeleton} ${styles[variant]}`} />
}
