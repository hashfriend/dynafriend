import { computed } from 'nanostores'
import {
  buildSummary,
  buildUserPositions,
  type PortfolioSummary,
  type UserPosition
} from '@/lib/positions'
import { $userData } from './user-data'
import { $vaultData } from './vault-data'

export interface PortfolioState {
  positions: UserPosition[]
  summary: PortfolioSummary
}

const DEFAULT_SUMMARY: PortfolioSummary = {
  totalValue: 0,
  totalProfit: 0,
  profitReady: true,
  portfolioApy: null
}

export const $portfolio = computed(
  [$vaultData, $userData],
  (vaultDataState, userDataState): PortfolioState => {
    const vaults = vaultDataState.data?.vaults ?? []
    const prices = vaultDataState.data?.prices ?? {}
    const userData = userDataState.data

    if (!userData || vaults.length === 0) {
      return { positions: [], summary: DEFAULT_SUMMARY }
    }

    const positions = buildUserPositions({
      vaults,
      eventData: userData.events,
      vaultsWithPositions: userData.vaultsWithPositions,
      maxWithdrawMap: userData.maxWithdrawMap,
      balanceMap: userData.balanceMap
    })

    const summary = buildSummary(positions, prices)

    return { positions, summary }
  }
)

export const $positions = computed($portfolio, (state) => state.positions)
export const $summary = computed($portfolio, (state) => state.summary)
