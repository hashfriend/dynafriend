import { computed } from 'nanostores'
import { buildSummary, type PortfolioSummary } from '@/lib/positions'
import { $positions } from './positions'
import { $prices } from './prices'

export type { PortfolioSummary } from '@/lib/positions'

export const $summary = computed(
  [$positions, $prices],
  (positions, pricesState): PortfolioSummary => {
    const prices = pricesState.data ?? {}
    return buildSummary(positions, prices)
  }
)
