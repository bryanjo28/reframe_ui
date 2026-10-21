import { useEffect, useRef, useState } from 'react'
import { AppIcon } from './AppIcon'
import { getNotifications, markPaymentNotificationRead, type PaymentNotification } from '../services/payments'
import { USAGE_UPDATED_EVENT } from '../services/usage'
import type { UiLanguage } from '../utils/uiLanguage'
import { translateText } from '../utils/uiLanguage'

const formatDate = (value: string, language: UiLanguage) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? (language === 'en' ? 'Date unavailable' : 'Tanggal tidak tersedia') : date.toLocaleString(language === 'en' ? 'en-US' : 'id-ID') }

function localizeNotification(item: PaymentNotification, language: UiLanguage) {
  if (language === 'id') return { title: item.title, message: item.message }
  const type = item.type.toLowerCase().replaceAll('-', '_')
  const rawTitle = item.title.trim()
  const rawMessage = item.message.trim()
  const referralCopy: Record<string, [string, string]> = {
    referral_registered: ['A friend joined through your link', 'Your friend signed up with your referral link. The bonus is granted after their first subscription payment passes validation.'],
    referral_pending: ['Referral reward under validation', 'The first eligible subscription payment was made. The referral bonus is under validation.'],
    referral_reward: ['Referral credits added', rawMessage.match(/^(\d+) AI Credits bonus referral sudah masuk dan berlaku selama (\d+) hari\.?$/i)
      ? `${rawMessage.match(/^(\d+) AI Credits bonus referral sudah masuk dan berlaku selama (\d+) hari\.?$/i)?.[1]} AI Credits have been added and expire in ${rawMessage.match(/^(\d+) AI Credits bonus referral sudah masuk dan berlaku selama (\d+) hari\.?$/i)?.[2]} days.`
      : 'Your referral reward has been added to your balance.'],
  }
  if (referralCopy[type]) return { title: referralCopy[type][0], message: referralCopy[type][1] }
  const titles: Record<string, string> = {
    'hasil generate topic': 'Topic generation complete',
    'top up berhasil': 'Top-up successful',
    'top-up berhasil': 'Top-up successful',
    'pembayaran berhasil': 'Payment successful',
    'pembayaran gagal': 'Payment failed',
    'konten berhasil dibuat': 'Content generated',
    'generasi konten selesai': 'Content generation complete',
  }
  let title = titles[rawTitle.toLowerCase()] || translateText(rawTitle, language)
  if (title === rawTitle && /topic.*success|success.*topic/.test(type)) title = 'Topic generation complete'
  if (title === rawTitle && /payment|top.?up/.test(type) && /success|paid|complete/.test(type)) title = 'Payment successful'
  if (title === rawTitle && /payment|top.?up/.test(type) && /fail|error|reject/.test(type)) title = 'Payment failed'

  const topicCount = rawMessage.match(/^(\d+)\s+topic berhasil dibuat\.?$/i)
  const creditsAdded = rawMessage.match(/^(\d[\d.,]*)\s+AI Credits sudah masuk\.?$/i)
  const messages: Record<string, string> = {
    'konten berhasil dibuat.': 'Content generated successfully.',
    'konten berhasil dibuat': 'Content generated successfully.',
    'pembayaran berhasil.': 'Payment completed successfully.',
    'pembayaran gagal.': 'Payment could not be completed.',
    'top up berhasil.': 'Your top-up was successful.',
  }
  let message = topicCount
    ? `${topicCount[1]} ${topicCount[1] === '1' ? 'topic' : 'topics'} created successfully.`
    : creditsAdded
      ? `${creditsAdded[1]} AI Credits have been added to your balance.`
      : messages[rawMessage.toLowerCase()] || translateText(rawMessage, language)
  const hasIndonesianText = (value: string) => /\b(berhasil|gagal|sudah|telah|masuk|dibuat|pembayaran|diperbarui|jadwal|konten|akun|silakan|kamu|anda|saldo|bertambah|ditambahkan|kredit|langganan|diproses|berakhir|kedaluwarsa)\b/i.test(value)
  if (title === rawTitle && hasIndonesianText(rawTitle)) {
    title = /topic/.test(type) ? 'Topic generation update' : /payment|top.?up/.test(type) ? (/fail|error|reject/.test(type) ? 'Payment failed' : 'Payment update') : notificationTone(type) === 'success' ? 'Update successful' : notificationTone(type) === 'error' ? 'Action needs attention' : 'Account update'
  }
  if (message === rawMessage && hasIndonesianText(rawMessage)) {
    message = /topic/.test(type) ? 'Your topic generation status has been updated.' : /payment|top.?up/.test(type) ? 'Your payment status has been updated.' : notificationTone(type) === 'success' ? 'Your request completed successfully.' : notificationTone(type) === 'error' ? 'Your request could not be completed. Please try again.' : 'There is an update to your account.'
  }
  if (message === rawMessage && /topic.*success|success.*topic/.test(type) && !rawMessage) message = 'Your topics are ready.'
  if (message === rawMessage && /payment|top.?up/.test(type) && !rawMessage) message = 'Your payment status has been updated.'
  return { title, message }
}

function notificationTone(type: string) {
  const parts = type.toLowerCase().split(/[_\s-]+/)
  if (parts.some((part) => ['error', 'failed', 'failure', 'rejected', 'cancelled', 'canceled'].includes(part))) return 'error'
  if (parts.some((part) => ['success', 'successful', 'succeeded', 'completed', 'paid'].includes(part))) return 'success'
  return 'info'
}

export function NotificationBell({ language = 'id' }: { language?: UiLanguage } = {}) {
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
        if (active) setError(language === 'en' ? 'Notifications could not be loaded.' : 'Notifikasi belum bisa dimuat.')
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
  }, [language])
  async function readNotification(id: string) {
    setReadingId(id)
    try {
    await markPaymentNotificationRead(id)
    readIds.current.add(id)
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    } catch {
      setError(language === 'en' ? 'Could not mark this notification as read. Try again.' : 'Notifikasi belum berhasil ditandai dibaca. Coba lagi.')
    } finally {
      setReadingId('')
    }
  }


  const unreadCount = notifications.filter((item) => !item.read_at).length
  const pageCount = Math.ceil(notifications.length / 5)
  const visibleNotifications = notifications.slice(page * 5, (page + 1) * 5)
  const visibleError = language === 'en'
    ? error === 'Notifikasi belum berhasil ditandai dibaca. Coba lagi.' ? 'Could not mark this notification as read. Try again.' : error ? 'Notifications could not be loaded.' : ''
    : error
  return (
      <div className="ai-credits-notification-toolbar">
        <div className="ai-credits-notifications" ref={notificationRef}>
          <button ref={bellRef} className="ai-credits-bell" type="button" aria-label={language === 'en' ? (unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications') : unreadCount ? `Notifikasi (${unreadCount} belum dibaca)` : 'Notifikasi'} aria-expanded={notificationsOpen} aria-controls="ai-credit-notifications" onClick={() => { if (!notificationsOpen) refreshRef.current(); setNotificationsOpen((open) => !open) }}>
            <AppIcon name="bell" />
            {unreadCount > 0 ? <span className="ai-credits-unread" aria-hidden="true">{unreadCount}</span> : null}
          </button>
          <div id="ai-credit-notifications" className={`ai-credits-notification-dropdown${notificationsOpen ? ' open' : ''}`} inert={!notificationsOpen}>
            <div className="payment-panel-head"><h2>{language === 'en' ? 'Notifications' : 'Notifikasi'}</h2><span>{unreadCount} {language === 'en' ? 'new' : 'baru'}</span></div>
            {visibleError && notificationsOpen ? <p role="alert">{visibleError}</p> : null}
            {loading && notificationsOpen ? <p>{language === 'en' ? 'Loading notifications...' : 'Memuat notifikasi...'}</p> : null}
            {notificationsOpen && !loading && (notifications.length ? visibleNotifications.map((item) => {
              const tone = notificationTone(item.type)
              const localized = localizeNotification(item, language)
              return <button className={`payment-notification notification-${tone}${item.read_at ? ' read' : ''}`} key={item.id} type="button" disabled={readingId !== ''} onClick={() => { if (!item.read_at) void readNotification(item.id) }}>
                <span className="notification-status-icon" aria-label={language === 'en' ? (tone === 'success' ? 'Success' : tone === 'error' ? 'Failed' : 'Information') : tone === 'success' ? 'Berhasil' : tone === 'error' ? 'Gagal' : 'Informasi'}><AppIcon name={tone === 'success' ? 'check' : tone === 'error' ? 'close' : 'info'} /></span>
                <span><strong>{localized.title}</strong><small>{localized.message}</small><time>{formatDate(item.created_at, language)}</time></span>
              </button>
            }) : <p className="payment-empty">{language === 'en' ? 'No notifications yet.' : 'Belum ada notifikasi.'}</p>)}
            {notificationsOpen && pageCount > 1 ? <div className="notification-pagination"><button type="button" aria-label={language === 'en' ? 'Previous notifications page' : 'Halaman notifikasi sebelumnya'} disabled={page === 0} onClick={() => setPage((current) => current - 1)}><AppIcon name="chevron-left" /></button><span>{page + 1} / {pageCount}</span><button type="button" aria-label={language === 'en' ? 'Next notifications page' : 'Halaman notifikasi berikutnya'} disabled={page >= pageCount - 1} onClick={() => setPage((current) => current + 1)}><AppIcon name="chevron-right" /></button></div> : null}
          </div>
        </div>
      </div>
  )
}

