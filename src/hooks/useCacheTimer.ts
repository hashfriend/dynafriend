import { useEffect, useState } from 'react'

interface CacheTimerResult {
  timeRemaining: number
  isFresh: boolean
  isStale: boolean
}

export function useCacheTimer(cacheExpiresAt: number | null): CacheTimerResult {
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (!cacheExpiresAt) {
      setTimeRemaining(0)
      return
    }

    const update = (): void => {
      const remaining = cacheExpiresAt - Date.now()
      setTimeRemaining(Math.max(0, remaining))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [cacheExpiresAt])

  const hasCache = cacheExpiresAt !== null
  return {
    timeRemaining,
    isFresh: hasCache && timeRemaining > 0,
    isStale: hasCache && timeRemaining === 0
  }
}
