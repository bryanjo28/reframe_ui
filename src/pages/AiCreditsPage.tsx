import { useCallback, useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import {
  getPaymentPage,
  type PaymentPageData,
} from '../services/payments'
import { getCurrentSubscription, type NormalizedCurrentSubscription } from '../services/subscriptionPlans'
import type { UiLanguage } from '../utils/uiLanguage'
import { translatePlanName } from '../utils/uiLanguage'

type AiCreditsPageProps = {
  onTopUp: () => void
  onViewPlans: () => void
  onViewPaymentHistory: () => void
  language: UiLanguage
}

const formatDate = (value: string, language: UiLanguage) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? (language === 'en' ? 'Date unavailable' : 'Tanggal tidak tersedia') : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
const formatShortDate = (value: string | null | undefined, language: UiLanguage) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'long' }).format(date)
}
const formatAmount = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('id-ID') : '—'

export function AiCreditsPage({ onTopUp, onViewPlans, onViewPaymentHistory, language }: AiCreditsPageProps) {
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState<NormalizedCurrentSubscription | null>(null)
  const load = useCallback(async () => {
    try {
      const paymentData = await getPaymentPage()
      setData(paymentData)
      const subscription = await getCurrentSubscription()
      setSubscription(subscription)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat AI Credits.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const subscriptionDetails = subscription?.raw || {}
  const plan = subscriptionDetails.plan as Record<string, unknown> | undefined
  const activePlanName = typeof plan?.name === 'string' ? plan.name : subscription?.planName || 'Free'
  const hasPaidPlan = activePlanName.toLowerCase() !== 'free'
  const contracts = Array.isArray(subscriptionDetails.contracts) ? subscriptionDetails.contracts as Record<string, unknown>[] : []
  const activeContract = contracts.find((contract) => contract.status === 'active')
  const activePeriod = typeof subscriptionDetails.active === 'object' && subscriptionDetails.active !== null
    ? subscriptionDetails.active as Record<string, unknown> : null
  const subscriptionPeriod = typeof subscriptionDetails.subscription === 'object' && subscriptionDetails.subscription !== null
    ? subscriptionDetails.subscription as Record<string, unknown> : null
  const endDate = activeContract?.ends_at || subscriptionPeriod?.endsAt || activePeriod?.ends_at
  const paidThrough = typeof endDate === 'string' ? endDate : null
  const planDuration = Number(activeContract?.duration_months || activePeriod?.duration_months || 1)
  const queued = Array.isArray(subscriptionDetails.queued) ? subscriptionDetails.queued as Record<string, unknown>[] : []

  if (loading) return <section className="payments-page"><p role="status">Memuat AI Credits...</p></section>

  return (
    <section className="payments-page ai-credits-page">
      <header className="page-header ai-credits-hero">
        <div><p className="eyebrow">AI Credits</p><h1>Kelola AI Credits kamu</h1><p className="page-description">Pantau saldo, pemakaian, dan riwayat credits dalam satu halaman.</p></div>
      </header>
      {error ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{error}</p></div> : null}
      <div className="ai-credits-actions ai-credits-actions-single">
        <section className="ai-credits-plan-section" aria-label="Paket langganan aktif">
          <div className="ai-credits-plan-intro"><strong>{language === 'en' ? 'Your plan' : 'Paket kamu'}</strong><span>{language === 'en' ? 'Manage your subscription or browse other plans.' : 'Kelola langganan atau lihat pilihan paket lainnya.'}</span></div>
          <div className="ai-credits-plan-card ai-credits-plan-card-summary">
            <div className="ai-credits-plan-copy">
              <strong>{translatePlanName(activePlanName, subscription?.planKey || activePlanName, language)}{hasPaidPlan ? <> · {planDuration} {language === 'en' ? (planDuration === 1 ? 'month' : 'months') : 'bulan'}</> : null}</strong>
              {hasPaidPlan ? <span>{paidThrough
                ? <>{language === 'en' ? 'Active until' : 'Aktif sampai'} {formatShortDate(paidThrough, language)}</>
                : language === 'en' ? 'End date unavailable' : 'Tanggal berakhir belum tersedia'}</span> : null}
              {hasPaidPlan ? <span>{language === 'en' ? 'Does not renew automatically.' : 'Tidak diperpanjang otomatis.'}</span> : null}
              {queued.map((item, index) => {
                const nextPlan = item.plan as Record<string, unknown> | undefined
                const name = typeof nextPlan?.name === 'string' ? nextPlan.name : typeof item.plan_name === 'string' ? item.plan_name : activePlanName
                const startsAt = item.starts_at || item.startsAt
                return <span key={String(item.id || index)}>{language === 'en' ? 'Next plan' : 'Paket berikutnya'}: {name}{typeof startsAt === 'string' ? <> · {language === 'en' ? 'Starts' : 'Mulai'} {formatShortDate(startsAt, language)}</> : null}</span>
              })}
              <button className="ai-credits-history-link" type="button" onClick={onViewPaymentHistory}>{language === 'en' ? 'View payment history' : 'Lihat riwayat pembayaran'} <span aria-hidden="true">↗</span></button>
            </div>
            <div className="ai-credits-summary-balance">
              <strong>{formatAmount(data?.balance)}</strong>
              <span>{language === 'en' ? 'AI Credits available' : 'AI Credits tersedia'}</span>
              <small>{language === 'en' ? 'Subscription' : 'Langganan'} {(data?.subscriptionBalance || 0).toLocaleString('id-ID')} · Top up {(data?.topUpBalance || 0).toLocaleString('id-ID')}</small>
              <div className="ai-credits-summary-actions">
                <button className="primary-button" type="button" onClick={onViewPlans}>{language === 'en' ? 'Buy next plan' : 'Beli paket berikutnya'}</button>
                <button className="ghost-button" type="button" onClick={onTopUp}>+ Top up Credit</button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="payment-detail-grid ai-credits-history-grid">
        <section className="payment-panel">
          <div className="payment-panel-head"><h2>Riwayat credits</h2></div>
          {data?.ledger.length ? data.ledger.map((item) => {
            const amount = item.credits_delta ?? item.amount ?? 0
            return <div className="token-ledger-row" key={item.id}>
              <div><strong>{(item.description || item.transaction_type || item.kind || 'Transaksi credits').replaceAll('_', ' ')}</strong><small>{formatDate(item.created_at, language)}</small></div>
              <span className={amount > 0 ? 'credit' : 'debit'}>{amount > 0 ? '+' : ''}{amount.toLocaleString('id-ID')}</span>
            </div>
          }) : <p className="payment-empty">Belum ada transaksi credits.</p>}
        </section>
        <section className="payment-panel">
          <div className="payment-panel-head"><h2>Usage History</h2></div>
          {data?.usageHistory?.length ? data.usageHistory.map((item) => <div className="token-ledger-row" key={item.request_id}>
            <div><strong>{item.feature.replaceAll('_', ' ')}</strong><small>{formatDate(item.created_at, language)} · {item.total_tokens.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')} {language === 'en' ? 'tokens' : 'token'} · {item.status}</small></div>
            <span className="debit">-{item.credits_charged} credits</span>
          </div>) : <p className="payment-empty">Belum ada penggunaan AI.</p>}
        </section>
      </div>
    </section>
  )
}
