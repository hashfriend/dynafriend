import { persistentAtom } from '@nanostores/persistent'
import { computed } from 'nanostores'
import type { YieldPeriod } from '@/lib/apy'
import {
  buildSummary,
  buildUserPositions,
  type PortfolioSummary,
  type UserPosition
} from '@/lib/positions'
import { $userAddress, $userData } from './user-data'
import { $vaultData } from './vault-data'

export interface PortfolioState {
  positions: UserPosition[]
  summary: PortfolioSummary
}

export const $yieldPeriod = persistentAtom<YieldPeriod>('yield-period', 'daily')

const DEFAULT_SUMMARY: PortfolioSummary = {
  totalValue: 0,
  totalProfit: 0,
  profitReady: true,
  portfolioApy: null,
  estimatedYield: null,
  yieldPeriod: 'daily'
}

let lastValidState: PortfolioState | null = null

export const $portfolio = computed(
  [$vaultData, $userData, $yieldPeriod],
  (vaultDataState, userDataState, yieldPeriod): PortfolioState => {
    const vaults = vaultDataState.data?.vaults ?? []
    const prices = vaultDataState.data?.prices ?? {}
    const userData = userDataState.data

    if (!userData || vaults.length === 0) {
      // User is still connected but stores temporarily lost data during a
      // nanoquery refetch (e.g. tab regained focus after cache expired).
      // Preserve the previous positions instead of flashing empty/skeletons.
      if (lastValidState && $userAddress.get()) {
        return lastValidState
      }
      lastValidState = null
      return { positions: [], summary: DEFAULT_SUMMARY }
    }

    const positions = buildUserPositions({
      vaults,
      eventData: userData.events,
      activeVaults: userData.vaultsWithPositions,
      maxWithdrawMap: userData.maxWithdrawMap,
      balanceMap: userData.balanceMap
    })

    const summary = buildSummary(positions, prices, yieldPeriod)
    const result = { positions, summary }

    if (positions.length > 0) {
      lastValidState = result
    }

    return result
  }
)

export const $positions = computed($portfolio, (state) => state.positions)
export const $summary = computed($portfolio, (state) => state.summary)

export function cycleYieldPeriod(): void {
  const current = $yieldPeriod.get()
  const next: YieldPeriod =
    current === 'daily' ? 'weekly' : current === 'weekly' ? 'monthly' : 'daily'
  $yieldPeriod.set(next)
}
