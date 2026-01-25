import { nanoquery } from '@nanostores/query'
import { atom, computed } from 'nanostores'
import type { Address } from 'viem'
import { VAULT_ADDRESSES } from '@/config/vaults'
import type { ContractResult } from '@/lib/dynavaults'
import {
  extractVaultsWithPositions,
  fetchBalances,
  fetchMaxWithdraw
} from '@/lib/positions'

export const $userAddress = atom<Address | null>(null)

export interface BalanceData {
  balances: ContractResult[]
  maxWithdraw: ContractResult[]
}

const [createBalanceFetcher] = nanoquery({
  fetcher: async (): Promise<BalanceData | null> => {
    const userAddress = $userAddress.get()
    if (!userAddress) return null

    const [balances, maxWithdraw] = await Promise.all([
      fetchBalances(userAddress),
      fetchMaxWithdraw(userAddress)
    ])

    return { balances, maxWithdraw }
  }
})

export const $userBalances = createBalanceFetcher<BalanceData | null>(
  ['balances', $userAddress],
  {
    cacheLifetime: 60_000,
    revalidateInterval: 60_000
  }
)

export const $vaultsWithPositions = computed($userBalances, (state) => {
  if (!state.data) return []
  return extractVaultsWithPositions(state.data.balances, VAULT_ADDRESSES)
})

export const $userLoading = computed($userBalances, (state) => state.loading)
