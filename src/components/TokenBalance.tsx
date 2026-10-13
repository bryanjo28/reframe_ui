import { useCallback, useEffect, useState } from 'react'
import { getMyUsage, USAGE_UPDATED_EVENT, type UsageUpdatedDetail } from '../services/usage'
import { AppIcon } from './AppIcon'
import { useToast } from './useToast'

export function TokenBalance({ onOpenCredits, onTopUp }: { onOpenCredits: () => void; onTopUp: () => void }) {
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
        info('AI selesai digunakan', `${creditsUsed.toLocaleString('id-ID')} AI Credits digunakan.`)
      }
      window.setTimeout(() => void refresh(true), 350)
    }
    window.addEventListener(USAGE_UPDATED_EVENT, handleUsage)
    return () => window.removeEventListener(USAGE_UPDATED_EVENT, handleUsage)
  }, [info, refresh])

  return <div className="workspace-token-bar" aria-label="Saldo AI Credits">
    <button className="workspace-token-balance" type="button" onClick={onOpenCredits}><AppIcon name="sparkles" /><span>AI Credits</span><strong>{loading ? '—' : remaining === null ? '—' : remaining.toLocaleString('id-ID')}</strong></button>
    <button type="button" onClick={onTopUp}>Top Up</button>
  </div>
}
