import { useEffect, useState } from 'react'

interface CacheTimerResult {
  timeRemaining: number
  isCacheActive: boolean
}

export function useCacheTimer(cacheExpiresAt: number | null): CacheTimerResult {
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (!cacheExpiresAt) {
      setTimeRemaining(0)
      return
    }

    const update = () => {
      const remaining = cacheExpiresAt - Date.now()
      setTimeRemaining(Math.max(0, remaining))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [cacheExpiresAt])

  return {
    timeRemaining,
    isCacheActive: cacheExpiresAt !== null && timeRemaining > 0
  }
}
