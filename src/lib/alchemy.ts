export interface AlchemyTransfer {
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

export interface ReceiptLog {
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

export function getAlchemyEndpoint(): string {
  const endpoint = import.meta.env.VITE_ALCHEMY_API_ENDPOINT
  if (!endpoint) {
    throw new Error('VITE_ALCHEMY_API_ENDPOINT not configured')
  }
  return endpoint
}

export async function getAssetTransfers(
  endpoint: string,
  params: {
    fromAddress?: string
    toAddress?: string
    contractAddresses: string[]
    fromBlock?: string
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

export async function getTransactionReceipt(
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
