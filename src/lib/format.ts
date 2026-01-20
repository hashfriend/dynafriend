/**
 * Format a bigint token value as a human-readable number
 */
export function formatTokenAmount(
  value: bigint,
  decimals: number,
  maxDecimals = 4
): string {
  const divisor = 10n ** BigInt(decimals)
  const integerPart = value / divisor
  const fractionalPart = value % divisor

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.slice(0, maxDecimals)

  if (Number(trimmedFractional) === 0) {
    return integerPart.toLocaleString()
  }

  return `${integerPart.toLocaleString()}.${trimmedFractional.replace(/0+$/, '')}`
}

/**
 * Format APY percentage for display
 */
export function formatApy(apy: number | null): string {
  if (apy === null) return '—'
  if (Number.isNaN(apy) || !Number.isFinite(apy)) return '—'
  return `${apy.toFixed(2)}%`
}

/**
 * Format USD value for display
 */
export function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}

/**
 * Format milliseconds as MM:SS countdown
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
