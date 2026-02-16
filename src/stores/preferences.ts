import { atom } from 'nanostores'
import type { YieldPeriod } from '@/lib/apy'

export const $yieldPeriod = atom<YieldPeriod>('daily')

export function cycleYieldPeriod(): void {
  const current = $yieldPeriod.get()
  const next: YieldPeriod =
    current === 'daily' ? 'weekly' : current === 'weekly' ? 'monthly' : 'daily'
  $yieldPeriod.set(next)
}
