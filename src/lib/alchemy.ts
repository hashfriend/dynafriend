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
  rawContract?: { value: string }
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
    results[vault] = { deposited: 0n, withdrawn: 0n }
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
      contractAddresses: [assetLower]
    })

    for (const tx of withdrawals) {
      const value = tx.rawContract?.value ? BigInt(tx.rawContract.value) : 0n
      results[vault].withdrawn += value
    }

    // Get share mints: vault token transfers to user (deposits)
    const shareMints = await getAssetTransfers(alchemyEndpoint, {
      toAddress: userLower,
      contractAddresses: [vaultLower],
      withMetadata: true
    })

    // For each mint, get the Deposit event from transaction receipt
    for (const tx of shareMints) {
      const from = tx.from?.toLowerCase()
      // Only count mints (from null address or vault itself)
      if (
        from !== '0x0000000000000000000000000000000000000000' &&
        from !== vaultLower
      ) {
        continue
      }

      if (!tx.hash) continue

      const logs = await getTransactionReceipt(alchemyEndpoint, tx.hash)

      for (const log of logs) {
        if (
          log.topics?.[0] === DEPOSIT_TOPIC &&
          log.address?.toLowerCase() === vaultLower
        ) {
          const data = log.data
          if (data && data.length >= 66) {
            const assets = BigInt(`0x${data.slice(2, 66)}`)
            results[vault].deposited += assets
          }
        }
      }
    }
  }

  return results
}
