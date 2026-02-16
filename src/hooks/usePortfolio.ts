import { useStore } from '@nanostores/react'
import { useMemo } from 'react'
import type { YieldPeriod } from '@/lib/apy'
import {
  buildSummary,
  buildUserPositions,
  type PortfolioSummary,
  type UserPosition
} from '@/lib/positions'
import { $yieldPeriod } from '@/stores/preferences'
import { useUserData } from './useUserData'
import { useVaultData } from './useVaultData'

const DEFAULT_SUMMARY: PortfolioSummary = {
  totalValue: 0,
  totalProfit: 0,
  profitReady: true,
  portfolioApy: null,
  estimatedYield: null,
  yieldPeriod: 'daily'
}

interface UsePortfolioReturn {
  positions: UserPosition[]
  summary: PortfolioSummary
  isLoading: boolean
}

export function usePortfolio(): UsePortfolioReturn {
  const { vaults, prices, isLoading: vaultLoading } = useVaultData()
  const { userData } = useUserData()
  const yieldPeriod = useStore($yieldPeriod) as YieldPeriod

  const positions = useMemo(() => {
    if (!userData || vaults.length === 0) return []
    return buildUserPositions({
      vaults,
      eventData: userData.events,
      activeVaults: userData.vaultsWithPositions,
      maxWithdrawMap: userData.maxWithdrawMap,
      balanceMap: userData.balanceMap
    })
  }, [vaults, userData])

  const summary = useMemo(() => {
    if (positions.length === 0) return { ...DEFAULT_SUMMARY, yieldPeriod }
    return buildSummary(positions, prices, yieldPeriod)
  }, [positions, prices, yieldPeriod])

  return {
    positions,
    summary,
    isLoading: vaultLoading
  }
}
