import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const SUBSCRIPTION_PLANS_ENDPOINT = '/api/subscription-plans'
const CURRENT_SUBSCRIPTION_ENDPOINT = '/api/subscriptions/me'

type ApiRecord = Record<string, unknown>

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readFirstString(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = getString(record[key])

    if (value) {
      return value
    }
  }

  return ''
}

function readFirstBoolean(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = getBoolean(record[key])

    if (typeof value === 'boolean') {
      return value
    }
  }

  return undefined
}

function readFirstNumber(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = getNumber(record[key])

    if (typeof value === 'number') {
      return value
    }
  }

  return undefined
}

function unwrapListPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  const visited = new Set<unknown>()

  function findArray(value: unknown): unknown[] | null {
    if (Array.isArray(value)) {
      return value
    }

    if (!isRecord(value) || visited.has(value)) {
      return null
    }

    visited.add(value)

    const candidates = [
      value.data,
      value.items,
      value.plans,
      value.planList,
      value.subscriptionPlans,
      value.subscription_plans,
    ]

    for (const candidate of candidates) {
      const nestedArray = findArray(candidate)

      if (nestedArray) {
        return nestedArray
      }
    }

    return null
  }

  const candidate = findArray(payload)

  return candidate ?? []
}

export type SubscriptionPlanRecord = ApiRecord

export type CurrentSubscriptionRecord = ApiRecord

export type NormalizedSubscriptionPlan = {
  id: string
  key: string
  name: string
  description: string
  price: number | null
  currency: string
  interval: string
  status: string
  active: boolean
  featured: boolean
  monthlyAiCredits: number | null
  raw: SubscriptionPlanRecord
}

export type NormalizedCurrentSubscription = {
  planId: string
  planKey: string
  planName: string
  status: string
  active: boolean
  raw: CurrentSubscriptionRecord
}

function buildAuthorizedHeaders() {
  const headers = buildApiHeaders()
  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function extractPlanId(record: ApiRecord) {
  return readFirstString(record, ['id', 'planId', 'plan_id', 'subscriptionPlanId', 'subscription_plan_id'])
}

function extractPlanKey(record: ApiRecord) {
  return (
    readFirstString(record, ['key', 'slug', 'code', 'planCode', 'plan_code']) ||
    extractPlanId(record)
  )
}

function extractPlanName(record: ApiRecord) {
  return (
    readFirstString(record, ['name', 'title', 'label']) ||
    extractPlanKey(record) ||
    'Subscription plan'
  )
}

function extractDescription(record: ApiRecord) {
  return readFirstString(record, ['description', 'summary', 'note', 'details'])
}

function extractStatus(record: ApiRecord) {
  return readFirstString(record, ['status', 'state', 'planStatus', 'plan_status'])
}

function extractCurrency(record: ApiRecord) {
  return readFirstString(record, ['currency', 'currencyCode', 'currency_code']) || 'IDR'
}

function extractInterval(record: ApiRecord) {
  return readFirstString(record, ['interval', 'billingInterval', 'billing_interval', 'period']) || 'monthly'
}

function isPlanActive(record: ApiRecord) {
  const explicitActive = readFirstBoolean(record, ['active', 'isActive', 'is_active'])

  if (typeof explicitActive === 'boolean') {
    return explicitActive
  }

  const status = extractStatus(record).toLowerCase()

  if (!status) {
    return true
  }

  return !['inactive', 'disabled', 'archived', 'deleted', 'draft'].includes(status)
}

function isPlanFeatured(record: ApiRecord) {
  return Boolean(readFirstBoolean(record, ['featured', 'isFeatured', 'is_featured']))
}

export function normalizeSubscriptionPlan(record: SubscriptionPlanRecord): NormalizedSubscriptionPlan {
  const id = extractPlanId(record)
  const key = extractPlanKey(record)
  const name = extractPlanName(record)
  const description = extractDescription(record)
  const price = readFirstNumber(record, ['price', 'amount', 'monthlyPrice', 'monthly_price'])

  return {
    id,
    key,
    name,
    description,
    price: typeof price === 'number' ? price : null,
    currency: extractCurrency(record),
    interval: extractInterval(record),
    status: extractStatus(record),
    active: isPlanActive(record),
    featured: isPlanFeatured(record),
    monthlyAiCredits:
      readFirstNumber(record, ['monthly_ai_credits', 'monthlyAiCredits', 'aiCredits', 'ai_credits']) ??
      null,
    raw: record,
  }
}

export function normalizeCurrentSubscription(record: CurrentSubscriptionRecord): NormalizedCurrentSubscription {
  const planRecord = isRecord(record.plan)
    ? record.plan
    : isRecord(record.subscriptionPlan)
      ? record.subscriptionPlan
      : isRecord(record.subscription_plan)
        ? record.subscription_plan
        : null

  const planId =
    readFirstString(record, ['planId', 'plan_id', 'subscriptionPlanId', 'subscription_plan_id']) ||
    (planRecord ? extractPlanId(planRecord) : '')
  const planKey =
    readFirstString(record, ['planKey', 'plan_key']) ||
    (planRecord ? extractPlanKey(planRecord) : planId)
  const planName =
    readFirstString(record, ['planName', 'plan_name']) ||
    (planRecord ? extractPlanName(planRecord) : planKey || 'Subscription')
  const status = extractStatus(record)
  const active = Boolean(
    readFirstBoolean(record, ['active', 'isActive', 'is_active']) ??
      (!status || !['inactive', 'canceled', 'cancelled', 'expired', 'archived'].includes(status.toLowerCase())),
  )

  return {
    planId,
    planKey,
    planName,
    status,
    active,
    raw: record,
  }
}

export async function listSubscriptionPlans() {
  const response = await fetch(buildApiUrl(SUBSCRIPTION_PLANS_ENDPOINT), {
    method: 'GET',
    headers: buildAuthorizedHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil subscription plans.')
  }

  const payload = (await response.json()) as unknown
  const records = unwrapListPayload(payload)

  return records
    .filter(isRecord)
    .map(normalizeSubscriptionPlan)
    .filter((plan) => plan.active)
}

export async function getCurrentSubscription() {
  const response = await fetch(buildApiUrl(CURRENT_SUBSCRIPTION_ENDPOINT), {
    method: 'GET',
    headers: buildAuthorizedHeaders(),
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Gagal mengambil subscription aktif.')
  }

  const payload = (await response.json()) as unknown

  if (!isRecord(payload)) {
    return null
  }

  const candidate =
    payload.data ?? payload.subscription ?? payload.currentSubscription ?? payload.current_subscription

  if (isRecord(candidate)) {
    return normalizeCurrentSubscription(candidate)
  }

  if (Array.isArray(candidate) && candidate.length > 0 && isRecord(candidate[0])) {
    return normalizeCurrentSubscription(candidate[0])
  }

  return normalizeCurrentSubscription(payload)
}
