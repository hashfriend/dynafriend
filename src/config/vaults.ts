import type { Address } from 'viem'

export interface VaultConfig {
  address: Address
  name: string
  externalUrl: string
}

export const VAULT_ADDRESSES: Address[] = [
  '0x67b93f6676bd1911c5FAe7Ffa90fFf5f35E14dCd',
  '0xdf71487381Ab5bD5a6B17eAa61FE2E6045A0e805',
  '0x1631CA6543adcB61e2B9e30189c8477981258274',
  '0xBba362347a4C2acCe05228b01249c42Ee0BEe29C',
  '0x7Fe44a8305df0d8F8d25f66cBd4212eA570c7882',
  '0xd8d294714F5b1A1104CFE75C0Bb4ceF547a05124',
  '0x5e0EA8c9801497758294755f6e85724b41417667',
  '0x0D6862C7896233D4244cE746c368049B87c98B37'
]

export const VAULTS: VaultConfig[] = VAULT_ADDRESSES.map((address) => ({
  address,
  name: '', // Will be fetched from contract
  externalUrl: `https://www.singularityfinance.ai/vaults/${address}:8453`
}))

export const SINGULARITY_FINANCE_URL = 'https://www.singularityfinance.ai'
