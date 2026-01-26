import {
  darkTheme,
  lightTheme,
  RainbowKitProvider
} from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { App } from '@/App'
import { config } from '@/lib/wagmi'

import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/global.css'

const queryClient = new QueryClient()

const themeConfig = {
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small'
} as const

const dark = darkTheme({
  ...themeConfig,
  accentColor: '#ff6b35',
  accentColorForeground: '#0a0a0a'
})
dark.colors.modalBackground = '#0a0a0a'
dark.colors.modalBorder = '#1a1a1a'
dark.fonts.body = 'SF Mono, Fira Code, monospace'

const light = lightTheme({
  ...themeConfig,
  accentColor: '#e55a2b',
  accentColorForeground: '#fafafa'
})
light.colors.modalBackground = '#fafafa'
light.colors.modalBorder = '#efeded'
light.fonts.body = 'SF Mono, Fira Code, monospace'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{ lightMode: light, darkMode: dark }}
          modalSize="compact"
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)
