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
