import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { QrisCheckoutModal } from '../components/QrisCheckoutModal'
import { PaymentMethodSelector } from '../components/PaymentMethodSelector'
import { notifyUsageChanged } from '../services/usage'
import { createPaymentOrder, getPaymentOrderStatus, getPaymentPage, type CreatedPaymentOrder } from '../services/payments'
import {
  getCurrentSubscription,
  listSubscriptionPlans,
  type NormalizedCurrentSubscription,
  type NormalizedSubscriptionPlan,
} from '../services/subscriptionPlans'

type SubscriptionPlansPageProps = {
  userId: string
  onOpenPayments?: () => void
}

function formatPrice(plan: NormalizedSubscriptionPlan) {
  if (plan.price === null || plan.price === 0) {
    return 'Free'
  }

  const formattedAmount = Math.abs(plan.price).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  })

  if ((plan.currency || 'IDR').toUpperCase() === 'IDR') {
    return `Rp ${formattedAmount}`
  }

  return `${plan.currency || 'IDR'} ${formattedAmount}`
}

function formatInterval(interval: string) {
  const normalized = interval.trim().toLowerCase()

  if (!normalized) {
    return 'monthly'
  }

  if (normalized === 'month' || normalized === 'monthly') {
    return 'per month'
  }

  if (normalized === 'year' || normalized === 'yearly' || normalized === 'annual') {
    return 'per year'
  }

  return normalized
}

function readRawNumber(raw: NormalizedSubscriptionPlan['raw'], keys: string[]) {
  for (const key of keys) {
    const value = raw[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

function formatPlanCount(value: number | null) {
  if (value === null) {
    return '-'
  }

  return value.toLocaleString('id-ID')
}

function getPlanTone(plan: NormalizedSubscriptionPlan) {
  const key = plan.key.toLowerCase()

  if (key.includes('creator')) {
    return 'business'
  }

  if (key.includes('pro')) {
    return 'pro'
  }

  return 'free'
}

function getPlanPriority(plan: NormalizedSubscriptionPlan) {
  const key = plan.key.toLowerCase()

  if (key.includes('free')) {
    return 0
  }

  if (key.includes('starter')) {
    return 1
  }

  if (key.includes('creator')) {
    return 2
  }

  if (key.includes('pro')) return 3

  return 99
}

function getPlanHighlights(plan: NormalizedSubscriptionPlan) {
  const raw = plan.raw
  const personas = formatPlanCount(readRawNumber(raw, ['max_personas', 'maxPersonas']))
  const pillars = formatPlanCount(readRawNumber(raw, ['max_content_pillars', 'maxContentPillars']))
  const credits = formatPlanCount(readRawNumber(raw, ['monthly_ai_credits', 'monthlyAiCredits']))
  const threads = readRawNumber(raw, ['max_threads_accounts', 'maxThreadsAccounts']) ?? 0
  const canSchedule = raw.can_schedule === true || raw.canSchedule === true

  return [
    `${personas} Persona`,
    `${pillars} Content Pillar`,
    `${credits} AI Credits${plan.key.toLowerCase().includes('free') ? ' sekali daftar' : '/bulan'}`,
    threads > 0 ? `${threads.toLocaleString('id-ID')} akun Threads` : 'Dengan koneksi Threads',
    canSchedule ? 'Schedule Post' : 'Dengan Schedule Post',
  ]
}

function isCurrentPlan(plan: NormalizedSubscriptionPlan, current: NormalizedCurrentSubscription | null) {
  if (!current) {
    return plan.key.toLowerCase().includes('free')
  }

  return Boolean(
    (current.planId && current.planId === plan.id) ||
      (current.planKey && current.planKey.toLowerCase() === plan.key.toLowerCase()) ||
      (current.planName && current.planName.toLowerCase() === plan.name.toLowerCase()),
  )
}

function SubscriptionPlanCard({
  plan,
  currentSubscription,
  onBuy,
}: {
  plan: NormalizedSubscriptionPlan
  currentSubscription: NormalizedCurrentSubscription | null
  onBuy: (plan: NormalizedSubscriptionPlan) => void
}) {
  const isOwned = isCurrentPlan(plan, currentSubscription)
  const tone = getPlanTone(plan)
  const highlights = getPlanHighlights(plan)

  return (
    <article className={`subscription-card tone-${tone}${isOwned ? ' owned' : ''}${plan.key.toLowerCase().includes('creator') ? ' recommended' : ''}`}>
      {plan.key.toLowerCase().includes('creator') ? <span className="subscription-recommended">Paling direkomendasikan</span> : null}
      <div className="subscription-card-head">
        <div>
          <span className="subscription-badge">{plan.key.toUpperCase()}</span>
          <h3>{plan.name}</h3>
        </div>
        <div className="subscription-price">
          <strong>{formatPrice(plan)}</strong>
          <span>{formatInterval(plan.interval)}</span>
        </div>
      </div>

      <ul className="subscription-feature-list subscription-plan-highlights" aria-label={`Detail plan ${plan.name}`}>
        {highlights.map((highlight) => (
          <li key={highlight}>
            <AppIcon name="check" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      <div className="subscription-card-footer">
        <button className="primary-button subscription-action" type="button" disabled={isOwned} onClick={() => onBuy(plan)}>
          {isOwned ? 'Current Plan' : `Buy ${plan.name}`}
        </button>
      </div>
    </article>
  )
}

const customPlanContactUrl =
  import.meta.env.VITE_CUSTOM_PLAN_CONTACT_URL?.trim() ||
  'mailto:hello@alurin.id?subject=Custom%20Plan%20alurin&body=Halo%20tim%20alurin%2C%20saya%20ingin%20mendiskusikan%20kebutuhan%20Custom%20Plan.'

function CustomPlanCard() {
  return (
    <article className="subscription-card tone-custom custom-plan-card">
      <div className="subscription-card-head">
        <div>
          <span className="subscription-badge">CUSTOM</span>
          <h3>Custom Plan</h3>
        </div>
        <div className="subscription-price custom-plan-price">
          <strong>Sesuai kebutuhan</strong>
          <span>Fleksibel</span>
        </div>
      </div>

      <p className="subscription-description">
        Untuk tim atau bisnis yang membutuhkan kapasitas lebih besar dari paket Max.
      </p>

      <ul className="subscription-feature-list custom-plan-features">
        <li><AppIcon name="check" /><span>AI Credits dalam jumlah khusus</span></li>
        <li><AppIcon name="check" /><span>Volume konten dan workspace lebih besar</span></li>
        <li><AppIcon name="check" /><span>Skema harga yang disesuaikan</span></li>
        <li><AppIcon name="check" /><span>Bantuan onboarding dan prioritas support</span></li>
      </ul>

      <div className="subscription-card-footer">
        <span className="pill subtle">Untuk kebutuhan besar</span>
        <a className="primary-button subscription-action custom-plan-action" href={customPlanContactUrl}>
          Contact Us
        </a>
      </div>
    </article>
  )
}

export function SubscriptionPlansPage({ userId, onOpenPayments }: SubscriptionPlansPageProps) {
  const [plans, setPlans] = useState<NormalizedSubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<NormalizedCurrentSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [checkoutPlan, setCheckoutPlan] = useState<NormalizedSubscriptionPlan | null>(null)
  const [checkoutOrder, setCheckoutOrder] = useState<CreatedPaymentOrder | null>(null)
  const [paymentMethods, setPaymentMethods] = useState(['qris'])
  const [selectedMethod, setSelectedMethod] = useState('qris')
  const [isBuying, setIsBuying] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadPlans() {
      setIsLoading(true)

      try {
        const [nextPlans, nextSubscription, paymentData] = await Promise.all([
          listSubscriptionPlans(),
          getCurrentSubscription(),
          getPaymentPage(),
        ])

        if (!isMounted) {
          return
        }

        const sellablePlanCodes = new Set(['free', 'starter', 'creator', 'pro'])
        const sortedPlans = nextPlans.filter((plan) => sellablePlanCodes.has(plan.key.toLowerCase())).sort((left, right) => {
          const priorityDiff = getPlanPriority(left) - getPlanPriority(right)

          if (priorityDiff !== 0) {
            return priorityDiff
          }

          return left.name.localeCompare(right.name)
        })

        setPlans(sortedPlans)
        setCurrentSubscription(nextSubscription)
        setPaymentMethods(paymentData.paymentMethods)
        setSelectedMethod(paymentData.paymentMethods[0] || 'qris')
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPlans([])
        setCurrentSubscription(null)
        setErrorMessage(
          error instanceof Error ? error.message : 'Gagal memuat subscription plans.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPlans()

    return () => {
      isMounted = false
    }
  }, [])

  const activePlan = useMemo(
    () => plans.find((plan) => isCurrentPlan(plan, currentSubscription)) || null,
    [currentSubscription, plans],
  )

  async function createPlanOrder() {
    if (!checkoutPlan || isBuying) return
    setIsBuying(true)
    try {
      const order = await createPaymentOrder({ planId: checkoutPlan.id, method: selectedMethod })
      if (order.checkoutAvailable === false) {
        setErrorMessage(order.message || 'Order tersimpan. Coba lagi checkout dari riwayat pembayaran.')
        setCheckoutPlan(null)
        onOpenPayments?.()
        return
      }
      setCheckoutOrder(order)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membuat order pembayaran. Coba lagi.')
    } finally {
      setIsBuying(false)
    }
  }

  async function refreshSubscription() {
    const nextSubscription = await getCurrentSubscription()
    setCurrentSubscription(nextSubscription)
  }

  return (
    <section className="subscription-page">
      <header className="page-header subscription-hero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Subscription</h1>
          {/* <p className="page-description">
            Lihat paket aktif yang tersedia, lalu cek paket yang sedang dimiliki akun ini
            lewat `GET /api/subscriptions/me`.
          </p> */}
        </div>

        <div className="subscription-hero-metrics" style={{paddingTop:"10px"}}>
          <div className="metric-card">
            <span>Visible plans</span>
            <strong>{isLoading ? '...' : plans.length}</strong>
          </div>
          <div className="metric-card">
            <span>Status</span>
            <strong>{userId ? 'Logged in' : 'Not ready'}</strong>
          </div>
          <div className="metric-card">
            <span>Current plan</span>
            <strong>{activePlan ? activePlan.name : 'Free'}</strong>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="integration-note integration-note-error">
          <AppIcon name="info" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="subscription-grid">
        {isLoading ? (
          <div className="generate-empty-state">
            <AppIcon name="sparkles" />
            <div>
              <strong>Memuat subscription plans...</strong>
              <p>Menunggu daftar paket aktif dan status subscription user.</p>
            </div>
          </div>
        ) : plans.length ? (
          plans.map((plan) => (
            <SubscriptionPlanCard
              key={plan.id || plan.key}
              plan={plan}
              currentSubscription={currentSubscription}
              onBuy={setCheckoutPlan}
            />
          ))
        ) : (
          <div className="generate-empty-state">
            <AppIcon name="info" />
            <div>
              <strong>Tidak ada plan aktif</strong>
              <p>Pastikan endpoint `GET /api/subscription-plans` mengembalikan paket aktif.</p>
            </div>
          </div>
        )}
        {!isLoading ? <CustomPlanCard /> : null}
      </div>
      {checkoutPlan && !checkoutOrder ? <div className="qris-modal-backdrop">
        <section className="payment-method-dialog" role="dialog" aria-modal="true" aria-label={`Pilih pembayaran ${checkoutPlan.name}`}>
          <header><div><p className="eyebrow">Metode pembayaran</p><h2>Bayar {checkoutPlan.name}</h2></div><button type="button" aria-label="Tutup pembayaran" onClick={() => setCheckoutPlan(null)}><AppIcon name="close" /></button></header>
          <PaymentMethodSelector methods={paymentMethods} value={selectedMethod} onChange={setSelectedMethod} name="subscription-payment-method" />
          <div className="payment-method-dialog-actions"><button className="ghost-button" type="button" onClick={() => setCheckoutPlan(null)}>Batal</button><button className="primary-button" type="button" disabled={isBuying} onClick={() => void createPlanOrder()}>{isBuying ? 'Membuat order...' : 'Bayar sekarang'}</button></div>
        </section>
      </div> : null}
      {checkoutPlan && checkoutOrder ? <QrisCheckoutModal
        open
        title={checkoutPlan.name}
        description={`${(checkoutPlan.monthlyAiCredits || 0).toLocaleString('id-ID')} AI Credits per bulan`}
        amount={checkoutOrder.amount_idr || checkoutPlan.price || 0}
        totalPayment={checkoutOrder.payment?.total_payment}
        paymentMethod={checkoutOrder.payment_method || selectedMethod}
        qrString={checkoutOrder.payment?.qr_string}
        vaNumber={checkoutOrder.payment?.va_number}
        checkoutUrl={checkoutOrder.checkoutUrl}
        expiresAt={checkoutOrder.providerExpiresAt || checkoutOrder.payment?.expired_at}
        orderId={checkoutOrder.id}
        checkStatus={getPaymentOrderStatus}
        onPaid={() => { notifyUsageChanged(); void refreshSubscription(); setCheckoutOrder(null); setCheckoutPlan(null) }}
        onClose={() => { setCheckoutOrder(null); setCheckoutPlan(null); onOpenPayments?.() }}
      /> : null}
    </section>
  )
}
