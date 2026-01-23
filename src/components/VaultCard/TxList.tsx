import { ExternalLinkIcon } from '@/components/icons'
import { formatTokenAmount } from '@/lib/format'
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

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

export function TxList({ cashFlows, assetDecimals, assetSymbol }: TxListProps) {
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
                <td>{formatDate(cf.timestamp)}</td>
                <td className={isDeposit ? styles.deposit : styles.withdraw}>
                  {sign}
                  {formatTokenAmount(absAmount, assetDecimals, 4)} {assetSymbol}
                </td>
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
