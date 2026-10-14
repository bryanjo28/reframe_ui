import { useEffect, useRef, useState } from 'react'
import { AppIcon } from './AppIcon'
import { getNotifications, markPaymentNotificationRead, type PaymentNotification } from '../services/payments'
import { USAGE_UPDATED_EVENT } from '../services/usage'

const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : date.toLocaleString('id-ID') }

function notificationTone(type: string) {
  const parts = type.toLowerCase().split(/[_\s-]+/)
  if (parts.some((part) => ['error', 'failed', 'failure', 'rejected', 'cancelled', 'canceled'].includes(part))) return 'error'
  if (parts.some((part) => ['success', 'successful', 'succeeded', 'completed', 'paid'].includes(part))) return 'success'
  return 'info'
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const [readingId, setReadingId] = useState('')
  const refreshRef = useRef<() => void>(() => {})
  const readIds = useRef(new Set<string>())

  useEffect(() => {
    if (!notificationsOpen) return
    const outside = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
        bellRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [notificationsOpen])


  useEffect(() => {
    let active = true
    let inFlight = false
    let refreshPending = false
    const retries = new Set<number>()
    const refresh = async () => {
      if (!active || document.visibilityState === 'hidden') return
      if (inFlight) { refreshPending = true; return }
      inFlight = true
      try {
        const data = await getNotifications()
        if (!active) return
        const next = data.slice(0, 10).map((item) => readIds.current.has(item.id) && !item.read_at ? { ...item, read_at: new Date().toISOString() } : item)
        setNotifications(next)
        setPage((current) => Math.min(current, Math.max(0, Math.ceil(next.length / 5) - 1)))
        setError('')
      } catch {
        if (active) setError('Notifikasi belum bisa dimuat.')
      } finally {
        inFlight = false
        if (active) setLoading(false)
        if (active && refreshPending) { refreshPending = false; void refresh() }
      }
    }
    refreshRef.current = () => { void refresh() }
    const processFinished = () => {
      void refresh()
      retries.forEach((id) => window.clearTimeout(id))
      retries.clear()
      for (const delay of [1200, 3500]) {
        const id = window.setTimeout(() => { retries.delete(id); void refresh() }, delay)
        retries.add(id)
      }
    }
    const resume = () => { void refresh() }
    void refresh()
    const interval = window.setInterval(resume, 10000)
    window.addEventListener(USAGE_UPDATED_EVENT, processFinished)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      active = false
      window.clearInterval(interval)
      retries.forEach((id) => window.clearTimeout(id))
      window.removeEventListener(USAGE_UPDATED_EVENT, processFinished)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
      refreshRef.current = () => {}
    }
  }, [])
  async function readNotification(id: string) {
    setReadingId(id)
    try {
    await markPaymentNotificationRead(id)
    readIds.current.add(id)
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    } catch {
      setError('Notifikasi belum berhasil ditandai dibaca. Coba lagi.')
    } finally {
      setReadingId('')
    }
  }


  const unreadCount = notifications.filter((item) => !item.read_at).length
  const pageCount = Math.ceil(notifications.length / 5)
  const visibleNotifications = notifications.slice(page * 5, (page + 1) * 5)
  return (
      <div className="ai-credits-notification-toolbar">
        <div className="ai-credits-notifications" ref={notificationRef}>
          <button ref={bellRef} className="ai-credits-bell" type="button" aria-label={unreadCount ? `Notifikasi (${unreadCount} belum dibaca)` : 'Notifikasi'} aria-expanded={notificationsOpen} aria-controls="ai-credit-notifications" onClick={() => { if (!notificationsOpen) refreshRef.current(); setNotificationsOpen((open) => !open) }}>
            <AppIcon name="bell" />
            {unreadCount > 0 ? <span className="ai-credits-unread" aria-hidden="true">{unreadCount}</span> : null}
          </button>
          <div id="ai-credit-notifications" className={`ai-credits-notification-dropdown${notificationsOpen ? ' open' : ''}`} inert={!notificationsOpen}>
            <div className="payment-panel-head"><h2>Notifikasi</h2><span>{unreadCount} baru</span></div>
            {error && notificationsOpen ? <p role="alert">{error}</p> : null}
            {loading && notificationsOpen ? <p>Memuat notifikasi...</p> : null}
            {notificationsOpen && !loading && (notifications.length ? visibleNotifications.map((item) => {
              const tone = notificationTone(item.type)
              return <button className={`payment-notification notification-${tone}${item.read_at ? ' read' : ''}`} key={item.id} type="button" disabled={readingId !== ''} onClick={() => { if (!item.read_at) void readNotification(item.id) }}>
                <span className="notification-status-icon" aria-label={tone === 'success' ? 'Berhasil' : tone === 'error' ? 'Gagal' : 'Informasi'}><AppIcon name={tone === 'success' ? 'check' : tone === 'error' ? 'close' : 'info'} /></span>
                <span><strong>{item.title}</strong><small>{item.message}</small><time>{formatDate(item.created_at)}</time></span>
              </button>
            }) : <p className="payment-empty">Belum ada notifikasi.</p>)}
            {notificationsOpen && pageCount > 1 ? <div className="notification-pagination"><button type="button" aria-label="Halaman notifikasi sebelumnya" disabled={page === 0} onClick={() => setPage((current) => current - 1)}><AppIcon name="chevron-left" /></button><span>{page + 1} / {pageCount}</span><button type="button" aria-label="Halaman notifikasi berikutnya" disabled={page >= pageCount - 1} onClick={() => setPage((current) => current + 1)}><AppIcon name="chevron-right" /></button></div> : null}
          </div>
        </div>
      </div>
  )
}

