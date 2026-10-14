import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'
import { SESSION_EXPIRED_EVENT } from '../utils/apiError'

type UsageApiRecord = Record<string, unknown>
const USAGE_CACHE_TTL_MS = 30_000
export const USAGE_UPDATED_EVENT = 'alurin:usage-updated'

export type UsageSummary = {
  credits: {
    total: number
    subscription: number
    topUp: number
    usedThisMonth: number
    nearestTopUpExpiration: string | null
  }
}

let usageCache:
  | {
      expiresAt: number
      token: string
      value: UsageSummary | null
    }
  | null = null

let usageRequest: Promise<UsageSummary | null> | null = null

export type UsageUpdatedDetail = { creditsUsed?: number }

export function extractCreditsUsed(payload: unknown): number | undefined {
  const visited = new Set<object>()
  function find(value: unknown, depth: number): number | undefined {
    if (!isRecord(value) || depth > 5 || visited.has(value)) return undefined
    visited.add(value)
    const direct = readFirstNumber(value, ['creditsUsed', 'credits_used', 'totalTokens', 'total_tokens'])
    if (typeof direct === 'number' && direct > 0) return Math.floor(direct)
    const priority = ['subscriptionUsage', 'subscription_usage', 'usage', 'data', 'result', 'generationLog', 'generation_log', 'outputPayload', 'output_payload']
    for (const key of priority) {
      const found = find(value[key], depth + 1)
      if (found) return found
    }
    for (const nested of Object.values(value)) {
      if (Array.isArray(nested)) {
        for (const item of nested) { const found = find(item, depth + 1); if (found) return found }
      } else {
        const found = find(nested, depth + 1)
        if (found) return found
      }
    }
    return undefined
  }
  return find(payload, 0)
}

export function notifyUsageChanged(payload?: unknown) {
  usageCache = null

  if (typeof window !== 'undefined') {
    const creditsUsed = typeof payload === 'number' ? payload : extractCreditsUsed(payload)
    window.dispatchEvent(new CustomEvent<UsageUpdatedDetail>(USAGE_UPDATED_EVENT, { detail: { creditsUsed } }))
  }
}

function isRecord(value: unknown): value is UsageApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function findCreditsRecord(payload: unknown, depth = 0): UsageApiRecord | null {
  if (!isRecord(payload) || depth > 2) return null
  if (isRecord(payload.credits)) return payload.credits
  return findCreditsRecord(payload.data, depth + 1)
}

function normalizeUsageSummary(payload: unknown): UsageSummary {
  const credits = findCreditsRecord(payload)
  const total = credits ? getNumber(credits.total) : undefined
  const subscription = credits ? getNumber(credits.subscription) : undefined
  const topUp = credits ? getNumber(credits.topUp) : undefined
  const usedThisMonth = credits ? getNumber(credits.usedThisMonth) : undefined

  if ([total, subscription, topUp, usedThisMonth].some((value) => value === undefined)) {
    throw new Error('Respons AI Credits tidak valid.')
  }

  return {
    credits: {
      total: total!,
      subscription: subscription!,
      topUp: topUp!,
      usedThisMonth: usedThisMonth!,
      nearestTopUpExpiration: typeof credits?.nearestTopUpExpiration === 'string'
        ? credits.nearestTopUpExpiration
        : null,
    },
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

export async function getMyUsage(options: { force?: boolean } = {}) {
  const token = getCurrentAuthToken() || ''

  if (options.force) {
    usageCache = null
  }

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

    if (token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return null
  }

  if (!response.ok) {
    throw new Error('Gagal mengambil usage user.')
  }

  const payload = (await response.json()) as unknown
  const normalizedUsage = normalizeUsageSummary(payload)

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
