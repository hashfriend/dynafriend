import { useStore } from '@nanostores/react'
import type { JSX } from 'react'
import { ExternalLinkIcon } from '@/components/icons'
import { formatDate, formatTokenAmount, shortenHash } from '@/lib/format'
import { $isPrivate, HIDDEN_VALUE } from '@/stores/privacy'
import styles from './TxList.module.css'

interface CashFlow {
  amount: bigint
  timestamp: number
  txHash: string
}

interface TxListProps {
  cashFlows: CashFlow[]
  assetDecimals: number
  assetSymbol: string
}

export function TxList({
  cashFlows,
  assetDecimals,
  assetSymbol
}: TxListProps): JSX.Element {
  const isPrivate = useStore($isPrivate)
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <tbody>
          {[...cashFlows].reverse().map((cf) => {
            const isDeposit = cf.amount < 0n
            const absAmount = isDeposit ? -cf.amount : cf.amount
            const sign = isDeposit ? '+' : '−'
            return (
              <tr key={cf.txHash}>
                <td className={isDeposit ? styles.deposit : styles.withdraw}>
                  {isPrivate
                    ? HIDDEN_VALUE
                    : `${sign}${formatTokenAmount(absAmount, assetDecimals, 4)} ${assetSymbol}`}
                </td>
                <td>{formatDate(cf.timestamp)}</td>
                <td className={styles.txHash}>
                  <a
                    href={`https://basescan.org/tx/${cf.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {shortenHash(cf.txHash)}
                    <ExternalLinkIcon className={styles.icon} />
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
