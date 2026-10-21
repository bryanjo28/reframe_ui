import { useCallback, useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import {
  getPaymentPage,
  type PaymentPageData,
} from '../services/payments'
import { getCurrentSubscription, listSubscriptionPlans, type NormalizedCurrentSubscription, type NormalizedSubscriptionPlan } from '../services/subscriptionPlans'
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
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'medium' }).format(date)
}
const formatAmount = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('id-ID') : '—'
const formatPaidAmount = (value: unknown, language: UiLanguage) => {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AiCreditsPage({ onTopUp, onViewPlans, onViewPaymentHistory, language }: AiCreditsPageProps) {
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePlan, setActivePlan] = useState<NormalizedSubscriptionPlan | null>(null)
  const [activePlanName, setActivePlanName] = useState('Free')
  const [subscription, setSubscription] = useState<NormalizedCurrentSubscription | null>(null)
  const load = useCallback(async () => {
    try {
      const paymentData = await getPaymentPage()
      setData(paymentData)
      const [subscriptionResult, plansResult] = await Promise.allSettled([
        getCurrentSubscription(),
        listSubscriptionPlans(),
      ])
      const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null
      const plans = plansResult.status === 'fulfilled' ? plansResult.value : []
      const matchedPlan = subscription
        ? plans.find((plan) => plan.id === subscription.planId || plan.key.toLowerCase() === subscription.planKey.toLowerCase() || plan.name.toLowerCase() === subscription.planName.toLowerCase()) || null
        : plans.find((plan) => plan.key.toLowerCase().includes('free') || plan.name.toLowerCase() === 'free') || null
      setActivePlan(matchedPlan)
      setActivePlanName(matchedPlan?.name || (subscription?.planName && subscription.active ? subscription.planName : 'Free'))
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
  const contracts = Array.isArray(subscriptionDetails.contracts)
    ? subscriptionDetails.contracts as Record<string, unknown>[]
    : []
  const activeContract = contracts.find((contract) =>
    ['active', 'queued'].includes(String(contract.status)) &&
    (!subscriptionDetails.coverageEndsAt || contract.ends_at === subscriptionDetails.coverageEndsAt),
  ) || contracts.find((contract) => contract.status === 'active')
  const activePeriod = typeof subscriptionDetails.active === 'object' && subscriptionDetails.active !== null
    ? subscriptionDetails.active as Record<string, unknown>
    : null
  const paidThrough = typeof subscriptionDetails.coverageEndsAt === 'string'
    ? subscriptionDetails.coverageEndsAt
    : typeof activeContract?.ends_at === 'string'
      ? activeContract.ends_at
      : null
  const daysRemaining = paidThrough ? Math.max(0, Math.ceil((Date.parse(paidThrough) - Date.now()) / 86_400_000)) : null
  const subscriptionStart = typeof activeContract?.starts_at === 'string' ? activeContract.starts_at : null
  const planDuration = Number(activeContract?.duration_months || 1)
  const monthlyCredits = Number(activePeriod?.monthly_credits || activePlan?.monthlyAiCredits || 0)
  const paidAmount = activeContract?.total_amount_idr
  const hasPaidPlan = activePlanName.toLowerCase() !== 'free' && !activePlan?.key.toLowerCase().includes('free')


  if (loading) {
    return (
      <section className="payments-page">
        <div className="generate-empty-state">
          <AppIcon name="sparkles" />
          <div><strong>Memuat AI Credits...</strong><p>Menyiapkan saldo dan riwayat penggunaanmu.</p></div>
        </div>
      </section>
    )
  }


  return (
    <section className="payments-page ai-credits-page">
      <header className="page-header ai-credits-hero">
        <div>
          <p className="eyebrow">AI Credits</p>
          <h1>Kelola AI Credits kamu</h1>
          <p className="page-description">
            Pantau saldo, pemakaian, dan riwayat credits dalam satu halaman.
          </p>
        </div>
        <div className="payment-balance ai-credits-balance">
          <div className="ai-credits-balance-heading"><span>Total AI Credits</span><button type="button" onClick={onTopUp}>+ Top up</button></div>
          <strong>{formatAmount(data?.balance)}</strong>
          <small>
            Langganan {(data?.subscriptionBalance || 0).toLocaleString('id-ID')} · Top up{' '}
            {(data?.topUpBalance || 0).toLocaleString('id-ID')}
          </small>
        </div>
      </header>

      {error ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{error}</p></div> : null}

      <div className="ai-credits-actions ai-credits-actions-single">
        <section className="ai-credits-plan-section" aria-label="Paket langganan aktif">
          <div className="ai-credits-plan-intro"><strong>{language === 'en' ? 'Your plan' : 'Paket kamu'}</strong><span>{language === 'en' ? 'Manage your subscription or browse other plans.' : 'Kelola langganan atau lihat pilihan paket lainnya.'}</span></div>
          <div className="ai-credits-plan-card ai-credits-plan-card-detailed">
            <div className="ai-credits-plan-top">
              <div className="ai-credits-plan-copy">
                <strong>{translatePlanName(activePlanName, activePlan?.key || activePlanName, language)}</strong>
                <small>{monthlyCredits.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')} AI Credits / {language === 'en' ? 'month' : 'bulan'}</small>
                {paidThrough ? <span>{language === 'en' ? 'Paid through' : 'Aktif sampai'} {formatShortDate(paidThrough, language)} · {daysRemaining} {language === 'en' ? 'days remaining' : 'hari tersisa'}</span> : null}
              </div>
              <button type="button" onClick={onViewPlans}>{language === 'en' ? 'View plans' : 'Lihat paket'}</button>
            </div>

            <dl className="ai-credits-subscription-details">
              <div><dt>{language === 'en' ? 'Current subscription' : 'Langganan saat ini'}</dt><dd>{translatePlanName(activePlanName, activePlan?.key || activePlanName, language)} · {planDuration} {language === 'en' ? 'months' : 'bulan'}</dd></div>
              <div><dt>{language === 'en' ? 'Paid' : 'Dibayar'}</dt><dd>{hasPaidPlan ? formatPaidAmount(paidAmount, language) : (language === 'en' ? 'Free' : 'Gratis')}</dd></div>
              <div><dt>{language === 'en' ? 'Subscription start' : 'Mulai langganan'}</dt><dd>{formatShortDate(subscriptionStart, language)}</dd></div>
              <div><dt>{language === 'en' ? 'Monthly credits' : 'Credits bulanan'}</dt><dd>{monthlyCredits.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}</dd></div>
              <div><dt>{language === 'en' ? 'Next credit refresh' : 'Refresh credits berikutnya'}</dt><dd>{formatShortDate(typeof activePeriod?.ends_at === 'string' ? activePeriod.ends_at : null, language)}</dd></div>
              <div><dt>{language === 'en' ? 'Current credit balance' : 'Saldo credits saat ini'}</dt><dd>{formatAmount(data?.balance)}</dd></div>
              <div className="ai-credits-renewal"><dt>{language === 'en' ? 'Renewal' : 'Perpanjangan'}</dt><dd>{hasPaidPlan ? (language === 'en' ? 'Manual · no auto-charge' : 'Manual · tanpa auto-debit') : '—'}</dd></div>
            </dl>

            {hasPaidPlan ? <p className="ai-credits-plan-note">{language === 'en'
              ? 'Your subscription is paid once through QRIS and does not renew automatically. Monthly credits refresh during the paid period.'
              : 'Langganan dibayar sekali melalui QRIS dan tidak diperpanjang otomatis. Credits bulanan diperbarui selama masa aktif.'}</p> : null}
            <button className="ai-credits-history-link" type="button" onClick={onViewPaymentHistory}>{language === 'en' ? 'View payment history' : 'Lihat riwayat pembayaran'}</button>
          </div>
        </section>
      </div>

      <div className="payment-detail-grid ai-credits-history-grid">
        <section className="payment-panel">
          <div className="payment-panel-head"><h2>Riwayat credits</h2></div>
          {data?.ledger.length ? data.ledger.map((item) => {
            const amount = item.credits_delta ?? item.amount ?? 0
            return (
              <div className="token-ledger-row" key={item.id}>
                <div><strong>{(item.description || item.transaction_type || item.kind || 'Transaksi credits').replaceAll('_', ' ')}</strong><small>{formatDate(item.created_at, language)}</small></div>
                <span className={amount > 0 ? 'credit' : 'debit'}>{amount > 0 ? '+' : ''}{amount.toLocaleString('id-ID')}</span>
              </div>
            )
          }) : <p className="payment-empty">Belum ada transaksi credits.</p>}
        </section>
      <section className="payment-panel">
        <div className="payment-panel-head"><h2>Usage History</h2></div>
        {data?.usageHistory?.length ? data.usageHistory.map((item) => (
          <div className="token-ledger-row" key={item.request_id}>
                <div><strong>{item.feature.replaceAll('_', ' ')}</strong><small>{formatDate(item.created_at, language)} · {item.total_tokens.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')} {language === 'en' ? 'tokens' : 'token'} · {item.status}</small></div>
            <span className="debit">-{item.credits_charged} credits</span>
          </div>
        )) : <p className="payment-empty">Belum ada penggunaan AI.</p>}
      </section>
      </div>
    </section>
  )
}
