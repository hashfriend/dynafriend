import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const alchemyEndpoint = import.meta.env.VITE_ALCHEMY_API_ENDPOINT || ''
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

export const config = getDefaultConfig({
  appName: 'DynaFriend',
  projectId: walletConnectProjectId,
  chains: [base],
  transports: {
    [base.id]: http(alchemyEndpoint)
  }
})

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(alchemyEndpoint)
  })
}
