import { useEffect, useState } from 'react'
import { getMyReferralDashboard, type ReferralDashboard } from '../services/referrals'
import type { UiLanguage } from '../utils/uiLanguage'
import { useToast } from '../components/useToast'

const statusLabel: Record<string, [string, string]> = {
  registered: ['Registered', 'Terdaftar'],
  awaiting_payment: ['Awaiting payment', 'Menunggu pembayaran'],
  pending_validation: ['Pending validation', 'Validasi 30 hari'],
  rewarded: ['Rewarded', 'Berhasil'],
  rejected: ['Rejected', 'Ditolak'],
  canceled: ['Canceled', 'Dibatalkan'],
}

function dateLabel(value: string | null, language: UiLanguage) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium' }).format(date)
}

export function ReferralPage({ language }: { language: UiLanguage }) {
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const english = language === 'en'

  async function load() {
    setLoading(true)
    setError('')
    try { setDashboard(await getMyReferralDashboard()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Referral data could not be loaded.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function copyLink() {
    if (!dashboard?.referralUrl) return
    try {
      await navigator.clipboard.writeText(dashboard.referralUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
      toast.success(english ? 'Link copied' : 'Link tersalin', english ? 'Share it with a friend.' : 'Bagikan ke temanmu.')
    } catch {
      toast.error(english ? 'Could not copy link' : 'Link belum tersalin', english ? 'Please copy the link manually.' : 'Silakan salin link secara manual.')
    }
  }

  const shareUrl = dashboard?.referralUrl ? `https://wa.me/?text=${encodeURIComponent(english ? `Try Alurin with my referral link: ${dashboard.referralUrl}` : `Coba Alurin lewat link referral aku: ${dashboard.referralUrl}`)}` : '#'

  return <main className="referral-page">
    <header className="page-header referral-header">
      <div><p className="eyebrow">Referral & Rewards</p><h1>{english ? 'Invite friends, earn AI Credits!' : 'Ajak Teman, Dapat AI Credits!'}</h1>
        <p className="page-description">{english ? `Share Alurin with your friends. When they subscribe for the first time, you get ${dashboard?.config.referrerBonusCredits ?? '—'} AI Credits and they get ${dashboard?.config.referredBonusCredits ?? '—'}.` : `Bagikan Alurin ke temanmu. Saat mereka berlangganan pertama kali, kamu dapat ${dashboard?.config.referrerBonusCredits ?? '—'} AI Credits dan mereka dapat ${dashboard?.config.referredBonusCredits ?? '—'} AI Credits.`}</p></div>
    </header>

    {loading ? <section className="panel referral-message" role="status">{english ? 'Loading your referral data…' : 'Memuat data referral…'}</section> : null}
    {!loading && error ? <section className="panel referral-message referral-error" role="alert"><p>{error}</p><button type="button" className="ghost-button" onClick={() => void load()}>{english ? 'Try again' : 'Coba lagi'}</button></section> : null}

    {!loading && dashboard ? <>
      {!dashboard.config.enabled || !dashboard.config.visible ? <section className="panel referral-message">{english ? 'The referral program is currently unavailable.' : 'Program referral sedang tidak tersedia.'}</section> : null}
      <section className="panel referral-link-card" aria-labelledby="referral-link-heading">
        <div className="referral-card-heading"><div><p className="eyebrow">{english ? 'Your referral link' : 'Link referral kamu'}</p><h2 id="referral-link-heading">{english ? 'Invite your friends' : 'Undang temanmu'}</h2></div><span className="referral-code-badge">{dashboard.referralCode}</span></div>
        <p>{english ? 'Your code is unique and permanent. Attribution stays valid for' : 'Kode ini unik dan permanen. Atribusi berlaku selama'} {dashboard.config.attributionWindowDays} {english ? 'days after signup starts.' : 'hari sejak proses pendaftaran dimulai.'}</p>
        <div className="referral-link-row"><input aria-label={english ? 'Referral link' : 'Link referral'} value={dashboard.referralUrl} readOnly /><button className="primary-button" type="button" onClick={() => void copyLink()}>{copied ? (english ? 'Copied' : 'Tersalin') : (english ? 'Copy link' : 'Salin link')}</button></div>
        <div className="referral-link-actions"><button type="button" className="ghost-button" onClick={() => void copyLink()}>{english ? 'Copy referral code' : 'Salin kode referral'}</button><a className="ghost-button" href={shareUrl} target="_blank" rel="noreferrer">{english ? 'Share via WhatsApp' : 'Bagikan via WhatsApp'}</a></div>
        <small>{english ? `Rewards are pending for ${dashboard.config.validationDays} days after a verified first subscription payment. Credits expire ${dashboard.config.rewardExpirationDays} days after they are granted. They do not unlock paid features.` : `Bonus menunggu validasi ${dashboard.config.validationDays} hari setelah pembayaran langganan pertama terverifikasi. Credits berlaku ${dashboard.config.rewardExpirationDays} hari sejak diberikan dan tidak membuka fitur paket berbayar.`}</small>
      </section>

      <section className="referral-stats-grid" aria-label={english ? 'Referral statistics' : 'Statistik referral'}>
        {[
          [english ? 'Link clicks' : 'Klik link', dashboard.stats.clicks],
          [english ? 'Friends registered' : 'Teman mendaftar', dashboard.stats.totalRegistrations],
          [english ? 'Awaiting payment' : 'Menunggu pembayaran', dashboard.stats.awaitingPayment],
          [english ? 'Pending validation' : 'Validasi berjalan', dashboard.stats.pendingValidation],
          [english ? 'Successful referrals' : 'Referral berhasil', dashboard.stats.successfulReferrals],
          [english ? 'Bonus credits earned' : 'Bonus credits didapat', dashboard.stats.bonusCreditsEarned],
        ].map(([label, value]) => <article className="panel referral-stat-card" key={String(label)}><span>{label}</span><strong>{Number(value).toLocaleString(english ? 'en-US' : 'id-ID')}</strong></article>)}
      </section>

      <section className="panel referral-history-card">
        <header><div><p className="eyebrow">{english ? 'Referral history' : 'Riwayat referral'}</p><h2>{english ? 'Your invited friends' : 'Teman yang kamu undang'}</h2></div><button type="button" className="ghost-button" onClick={() => void load()}>{english ? 'Refresh' : 'Muat ulang'}</button></header>
        {dashboard.referrals.length ? <div className="referral-history-list">{dashboard.referrals.map(item => <article className="referral-history-row" key={item.id}>
          <div className="referral-friend"><strong>{item.friend}</strong><small>{dateLabel(item.createdAt, language)}</small></div>
          <span className={`referral-status status-${item.status}`}>{statusLabel[item.status]?.[english ? 0 : 1] || item.status}</span>
          <span>{item.planCode ? item.planCode.toUpperCase() : '—'}</span>
          <span>{item.bonusCredits ? `${item.bonusCredits} ${english ? 'credits' : 'credits'}` : '—'}</span>
          <small>{item.grantedAt ? `${english ? 'Granted' : 'Diberikan'} ${dateLabel(item.grantedAt, language)}` : item.validationDueAt ? `${english ? 'Validation until' : 'Validasi sampai'} ${dateLabel(item.validationDueAt, language)}` : ''}</small>
        </article>)}</div> : <p className="referral-empty">{english ? 'No friends have joined yet. Share your referral link and start earning AI Credits!' : 'Belum ada teman yang bergabung. Bagikan link referral kamu dan mulai kumpulkan AI Credits!'}</p>}
      </section>
    </> : null}
  </main>
}
