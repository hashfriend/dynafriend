import { computed } from 'nanostores'
import { VAULT_ADDRESSES } from '@/config/vaults'
import { buildUserPositions } from '@/lib/positions'
import { $userEvents } from './events'
import { $userBalances, $vaultsWithPositions } from './user'
import { $vaults } from './vaults'

export const $positions = computed(
  [$userBalances, $userEvents, $vaults, $vaultsWithPositions],
  (balanceState, eventsState, vaultsState, vaultsWithPositions) => {
    const balanceData = balanceState.data
    const vaults = vaultsState.data ?? []
    if (!balanceData || vaults.length === 0) return []

    return buildUserPositions({
      balanceResults: balanceData.balances,
      maxWithdrawResults: balanceData.maxWithdraw,
      vaults,
      eventData: eventsState.data ?? {},
      vaultsWithPositions,
      vaultAddresses: VAULT_ADDRESSES
    })
  }
)
