import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { getAlchemyEndpoint } from './alchemy'

const alchemyEndpoint = getAlchemyEndpoint()
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

export const config = getDefaultConfig({
  appName: 'DynaFriend',
  projectId: walletConnectProjectId,
  chains: [base],
  pollingInterval: 30_000,
  transports: {
    [base.id]: http(alchemyEndpoint, { batch: true })
  }
})

const publicClient = createPublicClient({
  chain: base,
  transport: http(alchemyEndpoint, { batch: true })
})

export function getPublicClient() {
  return publicClient
}
