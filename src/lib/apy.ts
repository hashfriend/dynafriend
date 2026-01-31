import type { CashFlow } from '@/lib/events'

export type YieldPeriod = 'daily' | 'weekly' | 'monthly'

const DAYS_PER_PERIOD: Record<YieldPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30
}

/**
 * Calculate estimated yield for a given period based on APY.
 * Uses simple interest approximation: (value * apy / 100) * (days / 365)
 */
export function calculateEstimatedYield(
  totalValue: number,
  apy: number | null,
  period: YieldPeriod
): number | null {
  if (apy === null) return null
  const days = DAYS_PER_PERIOD[period]
  return (totalValue * apy * days) / 100 / 365
}

interface PositionValue {
  value: number
  apy: number | null
}

/**
 * Calculate weighted average APY from vault 24-hour APYs.
 * Each position's APY is weighted by its USD value.
 */
export function calculateWeightedApy(
  positions: PositionValue[]
): number | null {
  let totalValue = 0
  let weightedSum = 0

  for (const { value, apy } of positions) {
    if (apy === null) continue
    totalValue += value
    weightedSum += value * apy
  }

  if (totalValue === 0) return null
  return weightedSum / totalValue
}

/**
 * Calculate APY using XIRR (Extended Internal Rate of Return).
 *
 * Uses Newton-Raphson to solve: Σ(cashFlow_i / (1 + r)^years_i) = 0
 *
 * @param cashFlows - Cash flows with timestamps (negative = deposit, positive = withdrawal)
 * @param currentValue - Current position value in token units
 * @param decimals - Token decimals
 * @returns APY as percentage (e.g. 12.5 for 12.5%), or null if insufficient data
 */
export function calculateApy(
  cashFlows: CashFlow[],
  currentValue: bigint,
  decimals: number
): number | null {
  if (cashFlows.length === 0) return null

  const now = Math.floor(Date.now() / 1000)
  const firstDate = cashFlows[0].timestamp

  // Convert to numbers and add current value as final cash flow
  const flows: { amount: number; years: number }[] = cashFlows.map((cf) => ({
    amount: Number(cf.amount) / 10 ** decimals,
    years: (cf.timestamp - firstDate) / (365 * 86400)
  }))

  // Add current value as final positive cash flow
  flows.push({
    amount: Number(currentValue) / 10 ** decimals,
    years: (now - firstDate) / (365 * 86400)
  })

  return solveXirr(flows)
}

/**
 * Calculate APY using XIRR from USD-denominated cash flows.
 *
 * @param cashFlows - Cash flows in USD (negative = deposit, positive = withdrawal)
 * @param currentValueUsd - Current position value in USD
 * @returns APY as percentage, or null if insufficient data
 */
export function calculateApyFromUsd(
  cashFlows: { amount: number; timestamp: number }[],
  currentValueUsd: number
): number | null {
  if (cashFlows.length === 0) return null

  const sorted = [...cashFlows].sort((a, b) => a.timestamp - b.timestamp)
  const firstDate = sorted[0].timestamp
  const now = Math.floor(Date.now() / 1000)

  const flows = sorted.map((cf) => ({
    amount: cf.amount,
    years: (cf.timestamp - firstDate) / (365 * 86400)
  }))

  flows.push({
    amount: currentValueUsd,
    years: (now - firstDate) / (365 * 86400)
  })

  return solveXirr(flows)
}

/**
 * Solve for XIRR using Newton-Raphson method.
 */
function solveXirr(flows: { amount: number; years: number }[]): number | null {
  const totalYears = flows[flows.length - 1].years
  if (totalYears < 0.001) return null // Less than ~9 hours

  let rate = 0.1 // Initial guess: 10%

  for (let i = 0; i < 100; i++) {
    let npv = 0
    let dnpv = 0

    for (const flow of flows) {
      const factor = (1 + rate) ** flow.years
      npv += flow.amount / factor
      dnpv -= (flow.years * flow.amount) / (factor * (1 + rate))
    }

    if (Math.abs(npv) < 1e-6) break
    if (Math.abs(dnpv) < 1e-10) break

    const newRate = rate - npv / dnpv
    rate = Math.max(-0.99, Math.min(100, newRate))

    if (Math.abs(newRate - rate) < 1e-8) break
  }

  return rate * 100
}
