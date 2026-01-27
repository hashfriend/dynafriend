import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import type { JSX } from 'react'
import { useAccount } from 'wagmi'
import { PrivacyToggle } from '@/components/PrivacyToggle/PrivacyToggle'
import styles from './ConnectButton.module.css'

export function ConnectButton(): JSX.Element {
  const { status } = useAccount()
  const isConnected = status === 'connected'

  return (
    <div className={styles.container}>
      {isConnected && <PrivacyToggle />}
      <RainbowConnectButton
        showBalance={false}
        accountStatus={{ smallScreen: 'address', largeScreen: 'full' }}
      />
    </div>
  )
}
