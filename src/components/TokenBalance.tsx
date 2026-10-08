import { useCallback, useEffect, useState } from 'react'
import { getMyUsage, USAGE_UPDATED_EVENT, type UsageUpdatedDetail } from '../services/usage'
import { AppIcon } from './AppIcon'
import { useToast } from './useToast'

export function TokenBalance({ onTopUp }: { onTopUp: () => void }) {
  const { info } = useToast()
  const [remaining, setRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (force = false) => {
    try {
      const usage = await getMyUsage({ force })
      setRemaining(usage?.remaining ?? null)
    } catch {
      setRemaining(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    function handleUsage(event: Event) {
      const creditsUsed = (event as CustomEvent<UsageUpdatedDetail>).detail?.creditsUsed
      if (creditsUsed && creditsUsed > 0) {
        info('AI selesai digunakan', `${creditsUsed.toLocaleString('id-ID')} token digunakan.`)
      }
      window.setTimeout(() => void refresh(true), 350)
    }
    window.addEventListener(USAGE_UPDATED_EVENT, handleUsage)
    return () => window.removeEventListener(USAGE_UPDATED_EVENT, handleUsage)
  }, [info, refresh])

  return <div className="workspace-token-bar" aria-label="Saldo token AI">
    <div className="workspace-token-balance"><AppIcon name="sparkles" /><span>Token</span><strong>{loading ? '—' : remaining === null ? '∞' : remaining.toLocaleString('id-ID')}</strong></div>
    <button type="button" onClick={onTopUp}>Top Up</button>
  </div>
}
