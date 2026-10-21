import { useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { QrisCheckoutModal } from '../components/QrisCheckoutModal'
import { PaymentMethodSelector } from '../components/PaymentMethodSelector'
import { CheckoutOrderSummary } from '../components/CheckoutOrderSummary'
import { notifyUsageChanged } from '../services/usage'
import { createPaymentOrder, getPaymentOrderStatus, getPaymentPage, type CreatedPaymentOrder } from '../services/payments'
import {
  getCurrentSubscription,
  listSubscriptionPlans,
  type NormalizedCurrentSubscription,
  type NormalizedSubscriptionPlan,
} from '../services/subscriptionPlans'
import type { UiLanguage } from '../utils/uiLanguage'
import { translatePlanName } from '../utils/uiLanguage'
import { getPreferredPaymentMethod, hasPaymentMethod } from '../utils/paymentMethods'

type SubscriptionPlansPageProps = {
  userId: string
  language: UiLanguage
  onOpenPayments?: () => void
}

function formatPrice(value: number | null) {
  if (value === null || value === 0) {
    return 'Free'
  }

  const formattedAmount = Math.abs(value).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  })

  return `Rp ${formattedAmount}`
}

function durationLabel(months: number, language: UiLanguage) {
  if (language === 'en') return months === 1 ? '1 month' : months === 12 ? '12 months' : '3 months'
  return months === 1 ? '1 bulan' : months === 12 ? '12 bulan' : '3 bulan'
}

function getDurationPrice(plan: NormalizedSubscriptionPlan, durationMonths: number) {
  const pricing = plan.raw.pricing as { prices?: Record<string, unknown> } | undefined
  const price = pricing?.prices?.[String(durationMonths)]
  return typeof price === 'number' && Number.isFinite(price) ? price : plan.price
}

function getSavingPercent(plan: NormalizedSubscriptionPlan, durationMonths: number) {
  const monthlyPrice = getDurationPrice(plan, 1)
  const totalPrice = getDurationPrice(plan, durationMonths)
  if (!monthlyPrice || !totalPrice || durationMonths <= 1) return 0
  return Math.max(0, Math.round((1 - totalPrice / (monthlyPrice * durationMonths)) * 100))
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

function formatPlanCount(value: number | null, language: UiLanguage) {
  if (value === null) {
    return '-'
  }

  return value.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')
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

function getPlanHighlights(plan: NormalizedSubscriptionPlan, language: UiLanguage) {
  const raw = plan.raw
  const personas = formatPlanCount(readRawNumber(raw, ['max_personas', 'maxPersonas']), language)
  const pillars = formatPlanCount(readRawNumber(raw, ['content_pillars', 'max_content_pillars', 'maxContentPillars']), language)
  const credits = formatPlanCount(readRawNumber(raw, ['monthly_ai_credits', 'monthlyAiCredits']), language)
  const threads = readRawNumber(raw, ['max_threads_accounts', 'maxThreadsAccounts']) ?? 0
  const canSchedule = raw.can_schedule === true || raw.canSchedule === true
  const isFree = plan.key.toLowerCase() === 'free'

  if (language === 'en') return [
    { label: `${credits} AI Credits${isFree ? ' on signup' : '/month'}`, included: true },
    { label: `${personas} ${personas === '1' ? 'persona' : 'personas'}`, included: true },
    { label: `${pillars} content pillars`, included: true },
    { label: 'Generate Topic & Content', included: true },
    { label: threads > 0 ? `Connect ${threads.toLocaleString('en-US')} Threads account` : 'No Threads connection', included: threads > 0 },
    { label: canSchedule ? 'Schedule Post' : 'Post scheduling unavailable', included: canSchedule },
  ]
  return [
    { label: `${credits} AI Credits${isFree ? ' sekali daftar' : '/bulan'}`, included: true },
    { label: `${personas} Persona`, included: true },
    { label: `${pillars} Content Pillar`, included: true },
    { label: 'Generate Topik & Konten', included: true },
    { label: threads > 0 ? `Connect ${threads.toLocaleString('id-ID')} akun Threads` : 'Tanpa Connect Threads', included: threads > 0 },
    { label: canSchedule ? 'Schedule Post' : 'Tanpa Schedule Post', included: canSchedule },
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
  durationMonths,
  language,
}: {
  plan: NormalizedSubscriptionPlan
  currentSubscription: NormalizedCurrentSubscription | null
  onBuy: (plan: NormalizedSubscriptionPlan, durationMonths: number) => void
  durationMonths: number
  language: UiLanguage
}) {
  const isOwned = isCurrentPlan(plan, currentSubscription)
  const tone = getPlanTone(plan)
  const highlights = getPlanHighlights(plan, language)
  const duration = plan.key.toLowerCase().includes('free') ? 1 : durationMonths
  const amount = getDurationPrice(plan, duration)
  const monthlyPrice = duration > 1 ? getDurationPrice(plan, 1) : null
  const regularTotal = monthlyPrice === null ? null : monthlyPrice * duration
  const hasDurationDiscount = regularTotal !== null && amount !== null && regularTotal > amount
  const saving = getSavingPercent(plan, duration)
  const mustRenewCurrentPlan = Boolean(currentSubscription?.active && !currentSubscription.planKey.toLowerCase().includes('free') && !isOwned)

  return (
    <article className={`subscription-card tone-${tone}${isOwned ? ' owned' : ''}${plan.key.toLowerCase().includes('creator') ? ' recommended' : ''}`}>
      {plan.key.toLowerCase().includes('creator') ? <span className="subscription-recommended">Paling direkomendasikan</span> : null}
      <div className="subscription-card-head">
        <div>
          <span className="subscription-badge">{plan.key.toUpperCase()}</span>
          <h3>{translatePlanName(plan.name, plan.key, language)}</h3>
        </div>
        <div className="subscription-price">
          {hasDurationDiscount ? <del className="subscription-price-original" aria-label={language === 'en' ? 'Regular price' : 'Harga normal'}>{formatPrice(regularTotal)}</del> : null}
          <strong>{formatPrice(amount)}</strong>
          <span>{language === 'en' ? `one-time payment for ${durationLabel(duration, language)}` : `bayar sekali untuk ${durationLabel(duration, language)}`}</span>
          {duration > 1 ? <small>{formatPrice(amount ? Math.round(amount / duration) : null)}{language === 'en' ? '/month effective' : '/bulan efektif'}</small> : null}
          {saving > 0 ? <em className="subscription-saving-badge">{language === 'en' ? `Save ${saving}%` : `Hemat ${saving}%`}</em> : null}
        </div>
      </div>

      <ul className="subscription-feature-list subscription-plan-highlights" aria-label={language === 'en' ? `Plan details for ${translatePlanName(plan.name, plan.key, language)}` : `Detail plan ${plan.name}`}>
        {highlights.map((highlight) => (
          <li className={highlight.included ? undefined : 'unavailable'} key={highlight.label}>
            <AppIcon name={highlight.included ? 'check' : 'minus'} />
            <span>{highlight.label}</span>
          </li>
        ))}
      </ul>

      <div className="subscription-card-footer">
        <button className="primary-button subscription-action" type="button" disabled={plan.key.toLowerCase().includes('free') || mustRenewCurrentPlan} onClick={() => onBuy(plan, duration)}>
          {isOwned ? (language === 'en' ? 'Renew Subscription' : 'Perpanjang langganan') : mustRenewCurrentPlan ? (language === 'en' ? 'Available after expiry' : 'Tersedia setelah masa aktif') : language === 'en' ? `Buy ${translatePlanName(plan.name, plan.key, language)}` : `Beli ${plan.name}`}
        </button>
      </div>
    </article>
  )
}

function getCustomPlanContactUrl(language: UiLanguage) {
  const subject = language === 'en' ? 'Custom Plan inquiry for alurin' : 'Permintaan informasi Custom Plan alurin'
  const body = language === 'en'
    ? [
        'Hello alurin Support,',
        '',
        'I am interested in a Custom Plan. Here are my requirements:',
        '',
        'Name:',
        'alurin account email:',
        'Estimated AI Credits needed per month:',
        'Number of team members:',
        'Main use case or features needed:',
        'Target start date:',
        '',
        'Please recommend a suitable plan and share the pricing.',
        '',
        'Thank you.',
      ].join('\n')
    : [
        'Halo tim Support alurin,',
        '',
        'Saya tertarik dengan Custom Plan. Berikut kebutuhan saya:',
        '',
        'Nama:',
        'Email akun alurin:',
        'Estimasi kebutuhan AI Credits per bulan:',
        'Jumlah anggota tim:',
        'Kebutuhan utama atau fitur yang diperlukan:',
        'Target mulai menggunakan:',
        '',
        'Mohon rekomendasi paket yang sesuai beserta informasi harganya.',
        '',
        'Terima kasih.',
      ].join('\n')

  return `mailto:alurin.support@alurin.pro?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function CustomPlanCard({ language }: { language: UiLanguage }) {
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
        <a className="primary-button subscription-action custom-plan-action" href={getCustomPlanContactUrl(language)}>
          Contact Us
        </a>
      </div>
    </article>
  )
}

export function SubscriptionPlansPage({ onOpenPayments, language = 'id' }: SubscriptionPlansPageProps) {
  const [plans, setPlans] = useState<NormalizedSubscriptionPlan[]>([])
  const [durationMonths, setDurationMonths] = useState(3)
  const [currentSubscription, setCurrentSubscription] = useState<NormalizedCurrentSubscription | null>(null)
  const [currentBalance, setCurrentBalance] = useState(0)
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
        setCurrentBalance(Number(paymentData.balance || 0))
        setDurationMonths(Number(sortedPlans.find((plan) => plan.key.toLowerCase() === 'starter')?.raw.defaultDurationMonths) || 3)
        setPaymentMethods(paymentData.paymentMethods)
        setSelectedMethod(getPreferredPaymentMethod(paymentData.paymentMethods))
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

  async function createPlanOrder() {
    if (!checkoutPlan || !hasPaymentMethod(paymentMethods, selectedMethod) || isBuying) return
    setIsBuying(true)
    try {
      const order = await createPaymentOrder({ planId: checkoutPlan.id, method: selectedMethod, durationMonths: durationMonths as 1 | 3 | 12 })
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

  if (checkoutPlan) {
    const availableDurationsRaw = checkoutPlan.raw.enabledDurations as number[] | undefined
    const availableDurations = [1, 3, 12].filter((months) => !availableDurationsRaw?.length || availableDurationsRaw.includes(months))
    const planPrice = getDurationPrice(checkoutPlan, durationMonths)
    const regularPrice = durationMonths > 1 && planPrice !== null ? (getDurationPrice(checkoutPlan, 1) ?? 0) * durationMonths : null
    const hasDurationDiscount = regularPrice !== null && planPrice !== null && regularPrice > planPrice
    const numberLocale = language === 'en' ? 'en-US' : 'id-ID'
    const checkoutPlanName = translatePlanName(checkoutPlan.name, checkoutPlan.key, language)

    return (
      <>
        <section className="payments-page payment-checkout-page subscription-checkout-page">
          <button className="settings-back" type="button" onClick={() => { setCheckoutOrder(null); setCheckoutPlan(null); setErrorMessage('') }}>
            <AppIcon name="chevron-left" /> {language === 'en' ? 'Back to plans' : 'Kembali ke paket'}
          </button>
          <header className="page-header payment-checkout-header">
            <div>
              <p className="eyebrow">{language === 'en' ? 'Subscription checkout' : 'Checkout langganan'}</p>
              <h1>{language === 'en' ? `Subscribe to ${checkoutPlanName}` : `Berlangganan ${checkoutPlanName}`}</h1>
              <p className="page-description">{language === 'en'
                ? 'Choose your subscription duration, review the order, then select a payment method.'
                : 'Pilih durasi langganan, periksa ringkasan order, lalu pilih metode pembayaran.'}</p>
            </div>
            <div className="payment-balance">
              <span>{language === 'en' ? 'Current balance' : 'Saldo saat ini'}</span>
              <strong>{currentBalance.toLocaleString(numberLocale)}</strong>
              <small>AI Credits {language === 'en' ? 'available' : 'tersedia'}</small>
            </div>
          </header>

          {errorMessage ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{errorMessage}</p></div> : null}

          <div className="payment-checkout-layout">
            <div className="payment-checkout-main">
              <section className="payment-checkout-section">
                <div className="payment-step-title"><span>1</span><div><h2>{language === 'en' ? 'Choose subscription duration' : 'Pilih durasi langganan'}</h2><p>{language === 'en' ? 'Your plan is paid once for the selected period.' : 'Paket dibayar satu kali untuk periode yang kamu pilih.'}</p></div></div>
                <div className="payment-package-options" role="radiogroup" aria-label={language === 'en' ? 'Subscription duration' : 'Durasi langganan'}>
                  {availableDurations.map((months) => {
                    const selected = durationMonths === months
                    const price = getDurationPrice(checkoutPlan, months)
                    const saving = getSavingPercent(checkoutPlan, months)
                    const originalPrice = months > 1 && price !== null ? (getDurationPrice(checkoutPlan, 1) ?? 0) * months : null
                    const hasDiscount = originalPrice !== null && price !== null && originalPrice > price
                    return (
                      <label className={`payment-package-option${selected ? ' selected' : ''}`} key={months}>
                        <input type="radio" name="subscription-duration" value={months} checked={selected} onChange={() => setDurationMonths(months)} aria-label={durationLabel(months, language)} />
                        <span className="payment-radio" aria-hidden="true" />
                        <span className="payment-package-copy"><strong>{durationLabel(months, language)}</strong><small>{saving > 0 ? `${language === 'en' ? 'Save' : 'Hemat'} ${saving}%` : (language === 'en' ? 'One-time payment' : 'Bayar satu kali')}</small></span>
                        <span className={`payment-package-prices${hasDiscount ? ' has-discount' : ''}`}>
                          {hasDiscount ? <del>{formatPrice(originalPrice)}</del> : null}
                          <strong className="payment-package-price">{formatPrice(price)}</strong>
                          {hasDiscount ? <small className="payment-package-discount">{language === 'en' ? `${formatPrice(originalPrice - price)} off` : `Diskon ${formatPrice(originalPrice - price)}`}</small> : null}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>

              <CheckoutOrderSummary
                title={language === 'en' ? 'Order summary' : 'Ringkasan order'}
                name={checkoutPlanName}
                description={`${(checkoutPlan.monthlyAiCredits || 0).toLocaleString(numberLocale)} AI Credits / ${language === 'en' ? 'month' : 'bulan'} · ${language === 'en' ? 'one-time payment' : 'bayar sekali di awal'}`}
                rows={[
                  { label: language === 'en' ? 'Subscription duration' : 'Durasi langganan', value: durationLabel(durationMonths, language) },
                  { label: language === 'en' ? 'AI Credits per month' : 'AI Credits per bulan', value: (checkoutPlan.monthlyAiCredits || 0).toLocaleString(numberLocale) },
                  { label: language === 'en' ? 'Plan price' : 'Harga paket', value: formatPrice(planPrice), originalValue: hasDurationDiscount ? formatPrice(regularPrice) : undefined },
                  ...(hasDurationDiscount ? [{ label: language === 'en' ? 'Discount' : 'Diskon', value: `−${formatPrice(regularPrice - planPrice)}`, variant: 'discount' as const }] : []),
                ]}
                totalLabel={language === 'en' ? 'Total payment' : 'Total pembayaran'}
                total={formatPrice(planPrice)}
                totalOriginal={hasDurationDiscount ? formatPrice(regularPrice) : undefined}
                note={language === 'en' ? 'Paid once at the start. Monthly credits are granted during the active period.' : 'Dibayar sekali di awal. Credits bulanan diberikan selama masa aktif.'}
              />

              <section className="payment-checkout-section">
                <div className="payment-step-title"><span>2</span><div><h2>{language === 'en' ? 'Payment method' : 'Metode pembayaran'}</h2><p>{language === 'en' ? 'Choose QRIS or a bank virtual account.' : 'Pilih QRIS atau virtual account bank.'}</p></div></div>
                <PaymentMethodSelector methods={paymentMethods} value={selectedMethod} onChange={setSelectedMethod} name="subscription-payment-method" language={language} />
              </section>

              <footer className="payment-checkout-footer">
                <div className="payment-checkout-footer-total"><span>{language === 'en' ? 'Total payment' : 'Total pembayaran'}</span><strong>{formatPrice(planPrice)}</strong></div>
                <button className="primary-button payment-checkout-button" type="button" disabled={isBuying || !hasPaymentMethod(paymentMethods, selectedMethod)} onClick={() => void createPlanOrder()}>
                  {isBuying ? (language === 'en' ? 'Creating order…' : 'Membuat order…') : language === 'en' ? 'Continue to payment' : 'Lanjutkan Pembayaran'}
                  {!isBuying ? <AppIcon name="chevron-right" /> : null}
                </button>
              </footer>
            </div>
          </div>
        </section>

        {checkoutOrder ? <QrisCheckoutModal
          open
          title={checkoutPlanName}
          description={`${(checkoutPlan.monthlyAiCredits || 0).toLocaleString(numberLocale)} AI Credits ${language === 'en' ? 'per month' : 'per bulan'} · ${language === 'en' ? `one-time payment for ${durationLabel(durationMonths, language)}, credits are granted monthly` : `bayar sekali untuk ${durationLabel(durationMonths, language)}, credits diberikan bulanan`}`}
          amount={checkoutOrder.amount_idr || planPrice || 0}
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
      </>
    )
  }

  return (
    <section className="subscription-page">
      <header className="page-header subscription-hero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Subscription</h1>
          <p className="page-description">{language === 'en'
            ? 'If your paid plan is still active, your newly purchased subscription will start after your current plan expires.'
            : 'Jika paket berbayar kamu masih aktif, langganan yang baru dibeli akan dimulai setelah masa aktif paket saat ini berakhir.'}</p>
        </div>

      </header>

      {errorMessage ? (
        <div className="integration-note integration-note-error">
          <AppIcon name="info" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="subscription-duration-picker" role="group" aria-label={language === 'en' ? 'Subscription duration' : 'Durasi langganan'}>
        <span>{language === 'en' ? 'Choose duration' : 'Pilih durasi'}</span>
        {[1, 3, 12].map((months) => {
          const allowed = (plans.find((plan) => plan.key.toLowerCase() === 'starter')?.raw.enabledDurations as number[] | undefined) || [1, 3, 12]
          return <button key={months} type="button" className={durationMonths === months ? 'selected' : ''} disabled={!allowed.includes(months)} aria-pressed={durationMonths === months} onClick={() => setDurationMonths(months)}>{months === 12 ? (language === 'en' ? '1 Year' : '1 Tahun') : durationLabel(months, language)}</button>
        })}
      </div>
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
              onBuy={(plan, months) => {
                const enabledDurations = plan.raw.enabledDurations as number[] | undefined
                setDurationMonths(enabledDurations?.length && !enabledDurations.includes(months) ? enabledDurations[0] : months)
                setCheckoutPlan(plan)
                setErrorMessage('')
              }}
              durationMonths={durationMonths}
              language={language}
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
        {!isLoading ? <CustomPlanCard language={language} /> : null}
      </div>
    </section>
  )
}
