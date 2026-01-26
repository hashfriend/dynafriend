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
