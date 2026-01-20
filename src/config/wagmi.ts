import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  baseAccount,
  injectedWallet,
  metaMaskWallet,
  rabbyWallet
} from '@rainbow-me/rainbowkit/wallets'
import { http } from 'viem'
import { base } from 'wagmi/chains'

const alchemyEndpoint = import.meta.env.VITE_ALCHEMY_API_ENDPOINT

export const config = getDefaultConfig({
  appName: 'DynaVault Dashboard',
  projectId: 'disabled',
  chains: [base],
  wallets: [
    {
      groupName: 'Popular',
      wallets: [injectedWallet, metaMaskWallet, rabbyWallet, baseAccount]
    }
  ],
  transports: {
    [base.id]: http(alchemyEndpoint)
  }
})
