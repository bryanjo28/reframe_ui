import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

type UsageApiRecord = Record<string, unknown>
const USAGE_CACHE_TTL_MS = 30_000

export type UsageSummary = {
  used: number
  limit: number | null
  remaining: number | null
  planName: string
}

let usageCache:
  | {
      expiresAt: number
      token: string
      value: UsageSummary | null
    }
  | null = null

let usageRequest: Promise<UsageSummary | null> | null = null

function isRecord(value: unknown): value is UsageApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function readFirstNumber(record: UsageApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = getNumber(record[key])

    if (typeof value === 'number') {
      return value
    }
  }

  return undefined
}

function readFirstString(record: UsageApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = getString(record[key])

    if (value) {
      return value
    }
  }

  return ''
}

function unwrapUsageRecord(payload: unknown): UsageApiRecord | null {
  if (!isRecord(payload)) {
    return null
  }

  const nestedCandidates = [
    payload.data,
    payload.usage,
    payload.result,
    payload.summary,
    payload.userUsage,
    payload.user_usage,
  ]

  for (const candidate of nestedCandidates) {
    if (isRecord(candidate)) {
      return candidate
    }
  }

  return payload
}

function normalizeUsageSummary(record: UsageApiRecord): UsageSummary {
  const monthlyUsage = isRecord(record.monthlyUsage)
    ? record.monthlyUsage
    : isRecord(record.monthly_usage)
      ? record.monthly_usage
      : null

  const used =
    (monthlyUsage
      ? readFirstNumber(monthlyUsage, ['used', 'requestCount', 'request_count'])
      : undefined) ??
    readFirstNumber(record, [
      'used',
      'usedTokens',
      'used_tokens',
      'usage',
      'usageTokens',
      'usage_tokens',
      'totalUsed',
      'total_used',
      'monthlyUsed',
      'monthly_used',
      'tokensUsed',
      'tokens_used',
      'creditsUsed',
      'credits_used',
    ]) ?? 0

  const remaining =
    (monthlyUsage
      ? readFirstNumber(monthlyUsage, ['remaining', 'remainingCount', 'remaining_count'])
      : undefined) ??
    readFirstNumber(record, [
      'remaining',
      'remainingTokens',
      'remaining_tokens',
      'tokensRemaining',
      'tokens_remaining',
      'creditsRemaining',
      'credits_remaining',
    ]) ??
    null

  const limit =
    (monthlyUsage
      ? readFirstNumber(monthlyUsage, [
          'limit',
          'monthlyLimit',
          'monthly_limit',
          'tokenLimit',
          'token_limit',
          'creditLimit',
          'credit_limit',
        ])
      : undefined) ??
    readFirstNumber(record, [
      'limit',
      'monthlyLimit',
      'monthly_limit',
      'tokenLimit',
      'token_limit',
      'tokensLimit',
      'tokens_limit',
      'creditLimit',
      'credit_limit',
      'creditsLimit',
      'credits_limit',
      'quota',
      'monthlyQuota',
      'monthly_quota',
    ]) ??
    null

  const nestedPlan = isRecord(record.plan)
    ? record.plan
    : isRecord(record.subscriptionPlan)
      ? record.subscriptionPlan
      : isRecord(record.subscription_plan)
        ? record.subscription_plan
        : null

  const planName =
    readFirstString(record, ['planName', 'plan_name', 'plan']) ||
    (nestedPlan ? readFirstString(nestedPlan, ['name', 'title', 'label', 'key', 'code']) : '') ||
    'Current plan'

  return {
    used,
    limit,
    remaining,
    planName,
  }
}

function buildAuthorizedHeaders() {
  const headers = buildApiHeaders()
  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export async function getMyUsage() {
  const token = getCurrentAuthToken() || ''

  if (usageCache && usageCache.token === token && usageCache.expiresAt > Date.now()) {
    return usageCache.value
  }

  if (usageRequest) {
    return usageRequest
  }

  usageRequest = (async () => {
  const response = await fetch(buildApiUrl('/api/usage/me'), {
    method: 'GET',
    headers: buildAuthorizedHeaders(),
  })

  if (response.status === 401) {
    usageCache = {
      expiresAt: Date.now() + USAGE_CACHE_TTL_MS,
      token,
      value: null,
    }

    return null
  }

  if (!response.ok) {
    throw new Error('Gagal mengambil usage user.')
  }

  const payload = (await response.json()) as unknown
  const record = unwrapUsageRecord(payload)

  if (!record) {
    usageCache = {
      expiresAt: Date.now() + USAGE_CACHE_TTL_MS,
      token,
      value: null,
    }

    return null
  }

  const normalizedUsage = normalizeUsageSummary(record)

  usageCache = {
    expiresAt: Date.now() + USAGE_CACHE_TTL_MS,
    token,
    value: normalizedUsage,
  }

  return normalizedUsage
  })()

  try {
    return await usageRequest
  } finally {
    usageRequest = null
  }
}
