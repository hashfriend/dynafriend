/**
 * Convert token amount to USD value.
 */
export function toUsdValue(
  amount: bigint,
  decimals: number,
  price: number
): number {
  return (Number(amount) / 10 ** decimals) * price
}
