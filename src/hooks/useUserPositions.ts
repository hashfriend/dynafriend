import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Address } from 'viem'
import { useConnection, useReadContracts } from 'wagmi'
import { dynavaultAbi } from '../abi/dynavault'
import { VAULT_ADDRESSES } from '../config/vaults'
import { fetchUserEvents } from '../lib/alchemy'
import {
  CACHE_TTL,
  type EventData,
  getCachedEvents,
  setCachedEvents
} from '../lib/cache'
import type { VaultData } from './useVaultData'

type ContractResult =
  | { status: 'success'; result: unknown }
  | { status: 'failure'; error: Error }

export interface UserPosition {
  vaultAddress: Address
  vaultData: VaultData
  shares: bigint
  currentValue: bigint
  totalDeposited: bigint
  totalWithdrawn: bigint
  profit: bigint | null
}

export function useUserPositions(vaults: VaultData[]) {
  const { address: userAddress, status } = useConnection()
  const isConnected = status === 'connected'
  const [depositData, setDepositData] = useState<EventData>({})
  const [eventsReady, setEventsReady] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [cacheExpiresAt, setCacheExpiresAt] = useState<number | null>(null)
  const fetchedRef = useRef(false)
  const lastUserRef = useRef<Address | undefined>(undefined)

  // Reset when user changes
  useEffect(() => {
    if (userAddress !== lastUserRef.current) {
      lastUserRef.current = userAddress
      fetchedRef.current = false
      setEventsReady(false)
      setDepositData({})
      setCacheExpiresAt(null)
    }
  }, [userAddress])

  // Get share balances for all vaults
  const balanceContracts = useMemo(
    () =>
      VAULT_ADDRESSES.map((address) => ({
        address,
        abi: dynavaultAbi,
        functionName: 'balanceOf' as const,
        args: [userAddress] as const
      })),
    [userAddress]
  )

  const { data: balanceResults, isLoading: isBalanceLoading } =
    useReadContracts({
      contracts: balanceContracts,
      query: {
        enabled: isConnected && !!userAddress,
        staleTime: 30000,
        refetchInterval: 60000
      }
    }) as {
      data: ContractResult[] | undefined
      isLoading: boolean
    }

  // Get maxWithdraw for each vault
  const maxWithdrawContracts = useMemo(
    () =>
      VAULT_ADDRESSES.map((address) => ({
        address,
        abi: dynavaultAbi,
        functionName: 'maxWithdraw' as const,
        args: [userAddress] as const
      })),
    [userAddress]
  )

  const { data: maxWithdrawResults, isLoading: isMaxWithdrawLoading } =
    useReadContracts({
      contracts: maxWithdrawContracts,
      query: {
        enabled: isConnected && !!userAddress,
        staleTime: 30000,
        refetchInterval: 60000
      }
    }) as {
      data: ContractResult[] | undefined
      isLoading: boolean
    }

  // Vaults where user has shares (for event fetching)
  const vaultsWithPositions = useMemo(() => {
    if (!balanceResults) return []
    const result: Address[] = []
    for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
      const balanceResult = balanceResults[i]
      if (
        balanceResult?.status === 'success' &&
        (balanceResult.result as bigint) > 0n
      ) {
        result.push(VAULT_ADDRESSES[i])
      }
    }
    return result
  }, [balanceResults])

  const fetchEvents = useCallback(async () => {
    if (!userAddress || fetchedRef.current || vaults.length === 0) return
    if (vaultsWithPositions.length === 0) {
      // No positions, mark as ready with empty data
      setEventsReady(true)
      return
    }

    fetchedRef.current = true

    // Check cache first
    const cached = getCachedEvents(userAddress)
    if (cached) {
      setDepositData(cached.data)
      setEventsReady(true)
      setCacheExpiresAt(cached.expiresAt)
      return
    }

    setIsLoadingEvents(true)

    try {
      const results = await fetchUserEvents(
        userAddress,
        vaults,
        vaultsWithPositions
      )
      setDepositData(results)
      setEventsReady(true)
      setCachedEvents(userAddress, results)
      setCacheExpiresAt(Date.now() + CACHE_TTL)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [userAddress, vaults, vaultsWithPositions])

  // Trigger event fetching after balance results are ready
  useEffect(() => {
    if (
      isConnected &&
      userAddress &&
      vaults.length > 0 &&
      balanceResults &&
      !fetchedRef.current
    ) {
      fetchEvents()
    }
  }, [isConnected, userAddress, vaults, balanceResults, fetchEvents])

  // Auto-refresh when cache expires
  useEffect(() => {
    if (!cacheExpiresAt || !isConnected || vaultsWithPositions.length === 0)
      return

    const timeUntilExpiry = cacheExpiresAt - Date.now()
    if (timeUntilExpiry <= 0) {
      // Already expired, trigger refresh
      fetchedRef.current = false
      fetchEvents()
      return
    }

    const timeout = setTimeout(() => {
      fetchedRef.current = false
      fetchEvents()
    }, timeUntilExpiry)

    return () => clearTimeout(timeout)
  }, [cacheExpiresAt, isConnected, vaultsWithPositions.length, fetchEvents])

  // Combine results into positions
  const positions = useMemo(() => {
    const result: UserPosition[] = []
    if (!balanceResults || !maxWithdrawResults || vaults.length === 0) {
      return result
    }

    for (let i = 0; i < VAULT_ADDRESSES.length; i++) {
      const vault = VAULT_ADDRESSES[i]
      const balanceResult = balanceResults[i]
      const maxWithdrawResult = maxWithdrawResults[i]
      const vaultData = vaults.find((v) => v.address === vault)
      const events = depositData[vault]

      if (!vaultData) continue

      const shares =
        balanceResult?.status === 'success'
          ? (balanceResult.result as bigint)
          : 0n

      const currentValue =
        maxWithdrawResult?.status === 'success'
          ? (maxWithdrawResult.result as bigint)
          : 0n

      const totalDeposited = events?.deposited ?? 0n
      const totalWithdrawn = events?.withdrawn ?? 0n
      const netInvested = totalDeposited - totalWithdrawn
      const profit = eventsReady ? currentValue - netInvested : null

      if (shares > 0n) {
        result.push({
          vaultAddress: vault,
          vaultData,
          shares,
          currentValue,
          totalDeposited,
          totalWithdrawn,
          profit
        })
      }
    }

    return result
  }, [balanceResults, maxWithdrawResults, vaults, depositData, eventsReady])

  return {
    positions,
    isLoading: isBalanceLoading || isMaxWithdrawLoading || isLoadingEvents,
    hasPositions: positions.length > 0,
    cacheExpiresAt
  }
}
