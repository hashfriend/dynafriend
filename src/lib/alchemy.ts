import type { Address } from 'viem'
import type { VaultData } from '../hooks/useVaultData'
import type { EventData } from './cache'

// Deposit event topic: keccak256("Deposit(address,address,uint256,uint256)")
const DEPOSIT_TOPIC =
  '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7'

interface AlchemyTransfer {
  from: string
  to: string
  hash: string
  value: number | null
  rawContract?: { value: string; decimal?: string }
  metadata?: { blockTimestamp: string }
}

interface AlchemyResponse {
  result?: {
    transfers?: AlchemyTransfer[]
  }
}

interface ReceiptLog {
  address: string
  topics: string[]
  data: string
}

interface ReceiptResponse {
  result?: {
    logs?: ReceiptLog[]
  }
}

async function fetchAlchemy<T>(
  endpoint: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  })
  return response.json()
}

async function getAssetTransfers(
  endpoint: string,
  params: {
    fromAddress?: string
    toAddress?: string
    contractAddresses: string[]
    withMetadata?: boolean
  }
): Promise<AlchemyTransfer[]> {
  const response = await fetchAlchemy<AlchemyResponse>(
    endpoint,
    'alchemy_getAssetTransfers',
    [
      {
        ...params,
        category: ['erc20'],
        maxCount: '0x3e8'
      }
    ]
  )
  return response.result?.transfers ?? []
}

async function getTransactionReceipt(
  endpoint: string,
  txHash: string
): Promise<ReceiptLog[]> {
  const response = await fetchAlchemy<ReceiptResponse>(
    endpoint,
    'eth_getTransactionReceipt',
    [txHash]
  )
  return response.result?.logs ?? []
}

export async function fetchUserEvents(
  userAddress: Address,
  vaults: VaultData[],
  vaultAddresses: Address[]
): Promise<EventData> {
  const alchemyEndpoint = import.meta.env.VITE_ALCHEMY_API_ENDPOINT
  if (!alchemyEndpoint) {
    throw new Error('VITE_ALCHEMY_API_ENDPOINT not configured')
  }

  const results: EventData = {}
  for (const vault of vaultAddresses) {
    results[vault] = {
      deposited: 0n,
      withdrawn: 0n,
      positionStartTime: null,
      depositedInPosition: 0n,
      withdrawnInPosition: 0n
    }
  }

  const userLower = userAddress.toLowerCase()

  for (const vault of vaultAddresses) {
    const vaultData = vaults.find((v) => v.address === vault)
    if (!vaultData) continue

    const vaultLower = vault.toLowerCase()
    const assetLower = vaultData.assetAddress.toLowerCase()

    // Get withdrawals: underlying asset transfers from vault to user
    const withdrawals = await getAssetTransfers(alchemyEndpoint, {
      fromAddress: vaultLower,
      toAddress: userLower,
      contractAddresses: [assetLower],
      withMetadata: true
    })

    // Store withdrawal data with timestamps for position filtering
    const withdrawalEvents: { timestamp: number; value: bigint }[] = []
    for (const tx of withdrawals) {
      const value = tx.rawContract?.value ? BigInt(tx.rawContract.value) : 0n
      results[vault].withdrawn += value
      if (tx.metadata?.blockTimestamp) {
        const timestamp = Math.floor(
          new Date(tx.metadata.blockTimestamp).getTime() / 1000
        )
        withdrawalEvents.push({ timestamp, value })
      }
    }

    // Get all share transfers TO user (incoming)
    const sharesIn = await getAssetTransfers(alchemyEndpoint, {
      toAddress: userLower,
      contractAddresses: [vaultLower],
      withMetadata: true
    })

    // Get all share transfers FROM user (outgoing - burns and transfers)
    const sharesOut = await getAssetTransfers(alchemyEndpoint, {
      fromAddress: userLower,
      contractAddresses: [vaultLower],
      withMetadata: true
    })

    // Build timeline of share balance changes to find current position start
    interface ShareEvent {
      timestamp: number
      delta: bigint
      hash: string
      isDeposit: boolean
    }

    const shareEvents: ShareEvent[] = []

    const getShareValue = (tx: AlchemyTransfer, decimals: number): bigint => {
      if (tx.rawContract?.value) {
        return BigInt(tx.rawContract.value)
      }
      if (tx.value !== null && tx.value !== undefined) {
        return BigInt(Math.round(tx.value * 10 ** decimals))
      }
      return 0n
    }

    for (const tx of sharesIn) {
      if (!tx.metadata?.blockTimestamp) continue
      const timestamp = Math.floor(
        new Date(tx.metadata.blockTimestamp).getTime() / 1000
      )
      const value = getShareValue(tx, vaultData.decimals)
      const from = tx.from?.toLowerCase()
      const isDeposit =
        from === '0x0000000000000000000000000000000000000000' ||
        from === vaultLower
      shareEvents.push({ timestamp, delta: value, hash: tx.hash, isDeposit })
    }

    for (const tx of sharesOut) {
      if (!tx.metadata?.blockTimestamp) continue
      const timestamp = Math.floor(
        new Date(tx.metadata.blockTimestamp).getTime() / 1000
      )
      const value = getShareValue(tx, vaultData.decimals)
      shareEvents.push({ timestamp, delta: -value, hash: tx.hash, isDeposit: false })
    }

    shareEvents.sort((a, b) => a.timestamp - b.timestamp)

    // Replay to find current position start (last time balance went 0 → positive)
    let balance = 0n
    let positionStartTime: number | null = null

    for (const event of shareEvents) {
      const prevBalance = balance
      balance += event.delta
      if (prevBalance <= 0n && balance > 0n) {
        positionStartTime = event.timestamp
      }
    }

    results[vault].positionStartTime = positionStartTime

    // Calculate withdrawals in current position
    for (const w of withdrawalEvents) {
      if (positionStartTime !== null && w.timestamp >= positionStartTime) {
        results[vault].withdrawnInPosition += w.value
      }
    }

    // Get deposit amounts from transaction receipts
    for (const event of shareEvents) {
      if (!event.isDeposit) continue

      const logs = await getTransactionReceipt(alchemyEndpoint, event.hash)
      for (const log of logs) {
        if (
          log.topics?.[0] === DEPOSIT_TOPIC &&
          log.address?.toLowerCase() === vaultLower
        ) {
          const data = log.data
          if (data && data.length >= 66) {
            const assets = BigInt(`0x${data.slice(2, 66)}`)
            results[vault].deposited += assets

            if (
              positionStartTime !== null &&
              event.timestamp >= positionStartTime
            ) {
              results[vault].depositedInPosition += assets
            }
          }
        }
      }
    }
  }

  return results
}
