import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import type { JSX } from 'react'
import { useConnection } from 'wagmi'
import { PrivacyToggle } from '@/components/PrivacyToggle/PrivacyToggle'
import styles from './ConnectButton.module.css'

export function ConnectButton(): JSX.Element {
  const { status } = useConnection()
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
