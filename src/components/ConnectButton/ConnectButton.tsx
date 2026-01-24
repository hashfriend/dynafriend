import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import type { JSX } from 'react'

export function ConnectButton(): JSX.Element {
  return (
    <RainbowConnectButton
      showBalance={false}
      accountStatus={{ smallScreen: 'address', largeScreen: 'full' }}
    />
  )
}
