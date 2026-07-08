import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import {
  getCurrentSubscription,
  listSubscriptionPlans,
  type NormalizedCurrentSubscription,
  type NormalizedSubscriptionPlan,
} from '../services/subscriptionPlans'

type SubscriptionPlansPageProps = {
  userId: string
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

function readRawString(raw: NormalizedSubscriptionPlan['raw'], keys: string[]) {
  for (const key of keys) {
    const value = raw[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
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

function formatCreatedAt(value: string) {
  if (!value) {
    return ''
  }

  const parsed = Date.parse(value)

  if (!Number.isFinite(parsed)) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function getPlanTone(plan: NormalizedSubscriptionPlan) {
  const key = plan.key.toLowerCase()

  if (key.includes('business')) {
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

  if (key.includes('pro')) {
    return 1
  }

  if (key.includes('business')) {
    return 2
  }

  return 99
}

function getPlanFeatures(plan: NormalizedSubscriptionPlan) {
  const raw = plan.raw
  const candidates = [
    raw.features,
    raw.benefits,
    raw.included,
    raw.includes,
    raw.items,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    }
  }

  const text = String(raw.features_text ?? raw.featureText ?? raw.feature_text ?? '').trim()

  if (text) {
    return text
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function getPlanDetails(plan: NormalizedSubscriptionPlan) {
  const raw = plan.raw
  const details = [
    {
      label: 'Max personas',
      value: formatPlanCount(readRawNumber(raw, ['max_personas', 'maxPersonas'])),
    },
    {
      label: 'Monthly AI credits',
      value: formatPlanCount(readRawNumber(raw, ['monthly_ai_credits', 'monthlyAiCredits'])),
    },
    {
      label: 'Daily topic gens',
      value: formatPlanCount(
        readRawNumber(raw, ['daily_topic_generations', 'dailyTopicGenerations']),
      ),
    },
    {
      label: 'Daily content gens',
      value: formatPlanCount(
        readRawNumber(raw, ['daily_content_generations', 'dailyContentGenerations']),
      ),
    },
  ]

  const createdAt = readRawString(raw, ['created_at', 'createdAt'])

  if (createdAt) {
    details.push({
      label: 'Created',
      value: formatCreatedAt(createdAt),
    })
  }

  return details
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
}: {
  plan: NormalizedSubscriptionPlan
  currentSubscription: NormalizedCurrentSubscription | null
}) {
  const isOwned = isCurrentPlan(plan, currentSubscription)
  const tone = getPlanTone(plan)
  const features = getPlanFeatures(plan)
  const details = getPlanDetails(plan)

  return (
    <article className={`subscription-card tone-${tone}${isOwned ? ' owned' : ''}`}>
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

      <p className="subscription-description">
        {plan.description || 'Paket aktif yang siap dipakai untuk workspace Anda.'}
      </p>

      <ul className="subscription-detail-list" aria-label={`Detail plan ${plan.name}`}>
        {details.map((detail) => (
          <li key={detail.label}>
            <AppIcon name="check" />
            <span>
              <strong>{detail.label}:</strong> {detail.value}
            </span>
          </li>
        ))}
      </ul>

      <ul className="subscription-feature-list">
        {features.length ? (
          features.slice(0, 4).map((feature) => (
            <li key={feature}>
              <AppIcon name="check" />
              <span>{feature}</span>
            </li>
          ))
        ) : (
          <>
            <li>
              <AppIcon name="check" />
              <span>Aktif untuk workspace ini</span>
            </li>
            <li>
              <AppIcon name="check" />
              <span>Dapat dipakai di dashboard</span>
            </li>
          </>
        )}
      </ul>

      <div className="subscription-card-footer">
        <span className={`pill ${isOwned ? '' : 'subtle'}`}>
          {isOwned ? 'Owned' : 'Available'}
        </span>
        <button className="primary-button subscription-action" type="button" disabled={isOwned}>
          {isOwned ? 'Current Plan' : `Buy ${plan.name}`}
        </button>
      </div>
    </article>
  )
}

export function SubscriptionPlansPage({ userId }: SubscriptionPlansPageProps) {
  const [plans, setPlans] = useState<NormalizedSubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<NormalizedCurrentSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPlans() {
      setIsLoading(true)

      try {
        const [nextPlans, nextSubscription] = await Promise.all([
          listSubscriptionPlans(),
          getCurrentSubscription(),
        ])

        if (!isMounted) {
          return
        }

        const sortedPlans = [...nextPlans].sort((left, right) => {
          const priorityDiff = getPlanPriority(left) - getPlanPriority(right)

          if (priorityDiff !== 0) {
            return priorityDiff
          }

          return left.name.localeCompare(right.name)
        })

        setPlans(sortedPlans)
        setCurrentSubscription(nextSubscription)
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

  return (
    <section className="subscription-page">
      <header className="page-header subscription-hero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Subscription Plans</h1>
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
            <span>User ID</span>
            <strong>{userId || 'Not ready'}</strong>
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
      </div>
    </section>
  )
}
