/**
 * Calculate personal APY based on time-weighted returns
 * @param profit - Profit in asset units
 * @param totalDeposited - Total deposited in asset units
 * @param firstDepositTimestamp - Unix timestamp of first deposit
 * @returns APY as a percentage (e.g., 12.5 for 12.5%)
 */
export function calculatePersonalApy(
  profit: bigint,
  totalDeposited: bigint,
  firstDepositTimestamp: number
): number | null {
  if (totalDeposited === 0n) return null

  const now = Math.floor(Date.now() / 1000)
  const holdingPeriodSeconds = now - firstDepositTimestamp

  if (holdingPeriodSeconds <= 0) return null

  const holdingPeriodDays = holdingPeriodSeconds / 86400

  // Return rate as a decimal
  const returnRate = Number(profit) / Number(totalDeposited)

  // APY = (1 + returnRate) ^ (365 / holdingPeriodDays) - 1
  const apy = (1 + returnRate) ** (365 / holdingPeriodDays) - 1

  // Return as percentage
  return apy * 100
}

/**
 * Format a bigint value as a human-readable number
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
 * Format APY for display
 */
export function formatApy(apy: number | null): string {
  if (apy === null) return '—'
  if (Number.isNaN(apy) || !Number.isFinite(apy)) return '—'
  return `${apy.toFixed(2)}%`
}

/**
 * Convert token amount to USD value
 */
export function toUsdValue(
  amount: bigint,
  decimals: number,
  price: number
): number {
  const value = Number(amount) / 10 ** decimals
  return value * price
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
