import type { Address } from 'viem'

export interface VaultConfig {
  address: Address
  name: string
  externalUrl: string
}

export const VAULT_ADDRESSES: Address[] = [
  '0x67b93f6676bd1911c5FAe7Ffa90fFf5f35E14dCd',
  '0xdf71487381Ab5bD5a6B17eAa61FE2E6045A0e805',
  '0xd8d294714F5b1A1104CFE75C0Bb4ceF547a05124'
]

export const VAULTS: VaultConfig[] = VAULT_ADDRESSES.map((address) => ({
  address,
  name: '', // Will be fetched from contract
  externalUrl: `https://www.singularityfinance.ai/vaults/${address}:8453`
}))

export const SINGULARITY_FINANCE_URL = 'https://www.singularityfinance.ai'
