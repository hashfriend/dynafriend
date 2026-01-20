import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { App } from './App'
import { config } from './config/wagmi'

import '@rainbow-me/rainbowkit/styles.css'
import './styles/global.css'

const queryClient = new QueryClient()

const theme = darkTheme({
  accentColor: '#ff6b35',
  accentColorForeground: '#0a0a0a',
  borderRadius: 'none',
  fontStack: 'system'
})

theme.colors.modalBackground = '#0a0a0a'
theme.colors.modalBorder = '#1a1a1a'
theme.fonts.body = 'SF Mono, Fira Code, monospace'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)
