import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'viem'
import { base } from 'wagmi/chains'

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
