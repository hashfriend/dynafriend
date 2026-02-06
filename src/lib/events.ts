import type { Address } from 'viem'
import { getAssetTransfers, getTransactionReceipt } from '@/lib/alchemy'
import type { VaultData } from '@/lib/dynavaults'

const DEPOSIT_TOPIC =
  '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7'

// Approximate Base block for June 30, 2025 (~28.5M blocks from launch)
const MIN_EVENT_BLOCK = '0x1B2A480'

export interface CashFlow {
  amount: bigint
  timestamp: number
  txHash: string
}

export interface VaultEvents {
  deposited: bigint
  withdrawn: bigint
  cashFlows: CashFlow[]
}

export type EventData = Record<string, VaultEvents>

interface SerializedCashFlow {
  amount: string
  timestamp: number
  txHash: string
}

interface SerializedVaultEvents {
  deposited: string
  withdrawn: string
  cashFlows: SerializedCashFlow[]
}

type SerializedEventData = Record<string, SerializedVaultEvents>

export interface CachedEvents {
  data: EventData
  cachedAt: number
  userAddress: string
}

interface SerializedCache {
  data: SerializedEventData
  cachedAt: number
  userAddress: string
}

/** BigInt-aware encoder for events localStorage */
export const eventsEncoder = {
  encode: (value: CachedEvents | null): string => {
    if (!value) return 'null'
    const serialized: SerializedCache = {
      cachedAt: value.cachedAt,
      userAddress: value.userAddress,
      data: Object.fromEntries(
        Object.entries(value.data).map(([key, v]) => [
          key,
          {
            deposited: v.deposited.toString(),
            withdrawn: v.withdrawn.toString(),
            cashFlows: v.cashFlows.map((cf) => ({
              amount: cf.amount.toString(),
              timestamp: cf.timestamp,
              txHash: cf.txHash
            }))
          }
        ])
      )
    }
    return JSON.stringify(serialized)
  },
  decode: (str: string): CachedEvents | null => {
    const parsed = JSON.parse(str) as SerializedCache | null
    if (!parsed?.data) return null
    const data: EventData = {}
    for (const [key, v] of Object.entries(parsed.data)) {
      data[key] = {
        deposited: BigInt(v.deposited),
        withdrawn: BigInt(v.withdrawn),
        cashFlows: v.cashFlows.map((cf) => ({
          amount: BigInt(cf.amount),
          timestamp: cf.timestamp,
          txHash: cf.txHash
        }))
      }
    }
    return { data, cachedAt: parsed.cachedAt, userAddress: parsed.userAddress }
  }
}

async function fetchVaultEvents(
  user: Address,
  vault: Address,
  vaultData: VaultData
): Promise<VaultEvents> {
  const userLower = user.toLowerCase()
  const vaultLower = vault.toLowerCase()
  const assetLower = vaultData.assetAddress.toLowerCase()
  const result: VaultEvents = { deposited: 0n, withdrawn: 0n, cashFlows: [] }

  const [withdrawals, sharesIn] = await Promise.all([
    getAssetTransfers({
      fromAddress: vaultLower,
      toAddress: userLower,
      contractAddresses: [assetLower],
      fromBlock: MIN_EVENT_BLOCK,
      withMetadata: true
    }),
    getAssetTransfers({
      toAddress: userLower,
      contractAddresses: [vaultLower],
      fromBlock: MIN_EVENT_BLOCK,
      withMetadata: true
    })
  ])

  for (const tx of withdrawals) {
    if (!tx.metadata?.blockTimestamp) continue
    const value = tx.rawContract?.value ? BigInt(tx.rawContract.value) : 0n
    const timestamp = Math.floor(
      new Date(tx.metadata.blockTimestamp).getTime() / 1000
    )
    result.withdrawn += value
    result.cashFlows.push({ amount: value, timestamp, txHash: tx.hash })
  }

  const depositTxs = sharesIn.filter(
    (tx) =>
      tx.from?.toLowerCase() === '0x0000000000000000000000000000000000000000' &&
      tx.metadata?.blockTimestamp
  )

  const receipts = await Promise.all(
    depositTxs.map((tx) => getTransactionReceipt(tx.hash))
  )

  for (let i = 0; i < depositTxs.length; i++) {
    const tx = depositTxs[i]
    const logs = receipts[i]
    const blockTimestamp = tx.metadata?.blockTimestamp
    if (!blockTimestamp) continue
    const timestamp = Math.floor(new Date(blockTimestamp).getTime() / 1000)

    for (const log of logs) {
      if (
        log.topics?.[0] === DEPOSIT_TOPIC &&
        log.address?.toLowerCase() === vaultLower &&
        log.data &&
        log.data.length >= 66
      ) {
        const assets = BigInt(`0x${log.data.slice(2, 66)}`)
        result.deposited += assets
        result.cashFlows.push({ amount: -assets, timestamp, txHash: tx.hash })
      }
    }
  }

  result.cashFlows.sort((a, b) => a.timestamp - b.timestamp)
  return result
}

/** Fetch user events from Alchemy (sequential to avoid rate limits) */
export async function fetchUserEvents(
  user: Address,
  vaults: VaultData[],
  vaultAddresses: Address[]
): Promise<EventData> {
  const vaultDataMap = new Map(vaults.map((v) => [v.address, v]))
  const result: EventData = {}

  for (const vault of vaultAddresses) {
    const vaultData = vaultDataMap.get(vault)
    if (!vaultData) {
      result[vault] = { deposited: 0n, withdrawn: 0n, cashFlows: [] }
      continue
    }
    result[vault] = await fetchVaultEvents(user, vault, vaultData)
  }

  return result
}
