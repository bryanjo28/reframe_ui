import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const REFERRAL_ATTRIBUTION_KEY = 'alurin.referral-attribution'

export type ReferralValidation = {
  valid: boolean
  code: string | null
  referralToken?: string
  expiresAt?: string
  referrerBonusCredits?: number
  referredBonusCredits?: number
  attributionWindowDays?: number
  disabled?: boolean
}

export type ReferralConfig = {
  enabled: boolean
  visible: boolean
  referrerBonusCredits: number
  referredBonusCredits: number
  attributionWindowDays: number
  validationDays: number
  rewardExpirationDays: number
  eligiblePlanCodes: string[]
}

async function api<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const token = authenticated ? getCurrentAuthToken() : null
  if (authenticated && !token) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: buildApiHeaders({
      withBody: Boolean(options.body),
      additionalHeaders: { ...(options.headers as Record<string, string> || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }),
  })
  const payload = await response.json().catch(() => ({})) as { success?: boolean; message?: string; error_code?: string; data?: T }
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Permintaan referral gagal. Coba lagi.')
  return (payload.data ?? payload) as T
}

type StoredAttribution = { token: string; code: string; expiresAt: number; referredBonusCredits?: number }

export function getStoredReferralAttribution(): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(REFERRAL_ATTRIBUTION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as StoredAttribution
    if (!value.token || !value.code || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
      localStorage.removeItem(REFERRAL_ATTRIBUTION_KEY)
      return null
    }
    return value
  } catch {
    return null
  }
}

export function saveReferralAttribution(validation: ReferralValidation): StoredAttribution | null {
  if (!validation.valid || !validation.referralToken || !validation.code || !validation.expiresAt) return getStoredReferralAttribution()
  const firstValid = getStoredReferralAttribution()
  if (firstValid) return firstValid
  const attribution = { token: validation.referralToken, code: validation.code, expiresAt: Date.parse(validation.expiresAt), referredBonusCredits: validation.referredBonusCredits }
  if (!Number.isFinite(attribution.expiresAt)) return null
  localStorage.setItem(REFERRAL_ATTRIBUTION_KEY, JSON.stringify(attribution))
  return attribution
}

export function clearReferralAttribution() {
  localStorage.removeItem(REFERRAL_ATTRIBUTION_KEY)
}

export async function validateReferralCode(code: string, trackClick = false) {
  const endpoint = trackClick ? 'resolve' : 'validate'
  return api<ReferralValidation>(`/api/referrals/${endpoint}/${encodeURIComponent(code.trim())}`)
}

export async function getReferralProgramConfig() {
  return api<ReferralConfig>('/api/referrals/config')
}

export type ReferralDashboard = {
  referralCode: string
  referralUrl: string
  config: Pick<ReferralConfig, 'enabled' | 'visible' | 'referrerBonusCredits' | 'referredBonusCredits' | 'attributionWindowDays' | 'validationDays' | 'rewardExpirationDays'>
  stats: { clicks: number; totalRegistrations: number; awaitingPayment: number; pendingValidation: number; successfulReferrals: number; bonusCreditsEarned: number }
  referrals: Array<{ id: string; friend: string; status: string; createdAt: string; planCode: string | null; paymentAmountIdr: number | null; bonusCredits: number | null; grantedAt: string | null; validationDueAt: string | null }>
}

export function getMyReferralDashboard() {
  return api<ReferralDashboard>('/api/referrals/me', {}, true)
}
