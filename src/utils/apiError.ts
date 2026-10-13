export type ApiError = {
  status: number
  code: string
  message: string
}

export class ApiResponseError extends Error {
  status: number
  code: string

  constructor({ status, code, message }: ApiError) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
    this.code = code
  }
}

const DEFAULT_API_ERROR: ApiError = {
  status: 500,
  code: 'UNKNOWN_ERROR',
  message: 'alurin sedang mengalami kendala. Coba lagi beberapa saat.',
}

export const SESSION_EXPIRED_EVENT = 'alurin:session-expired'
export const UPGRADE_PLAN_REQUIRED_EVENT = 'alurin:upgrade-plan-required'

const UPGRADE_PLAN_ERROR_CODES = new Set([
  'PERSONA_LIMIT_EXCEEDED',
  'CONTENT_PILLAR_LIMIT_EXCEEDED',
  'THREADS_PLAN_REQUIRED',
  'SCHEDULE_PLAN_REQUIRED',
])

export function isApplicationAuthError(error: ApiError) {
  return error.status === 401 && (
    error.code === 'INVALID_ACCESS_TOKEN' ||
    error.code === 'UNAUTHORIZED' ||
    error.code === 'TOKEN_EXPIRED'
  )
}

export function getUserFacingError(error: unknown, fallback = DEFAULT_API_ERROR.message) {
  if (error instanceof TypeError) return 'Koneksi internet bermasalah. Periksa koneksi kamu lalu coba lagi.'
  const apiError = getApiError(error)
  const value = `${apiError.code} ${apiError.message}`.toLowerCase()
  const technicalDetail = /(supabase|database|postgres|environment|env\b|api[_ -]?key|secret|not configured|configuration|econn|enotfound|fetch failed|stack trace|internal server)/i
  if (technicalDetail.test(value)) return fallback
  if (value.includes('quota') || value.includes('usage limit') || value.includes('token limit') || value.includes('insufficient credit')) return 'Token penggunaan kamu sudah habis. Lihat paket untuk melanjutkan.'
  if (value.includes('credit') && (value.includes('exceeded') || value.includes('habis'))) return 'Token penggunaan kamu sudah habis. Lihat paket untuk melanjutkan.'
  if (apiError.status === 429 || value.includes('rate limit')) return 'Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.'
  if (value.includes('timeout') || value.includes('timed out')) return 'Prosesnya memakan waktu lebih lama dari biasanya. Coba lagi dalam beberapa saat.'
  if (apiError.code === 'INVALID_CREDENTIALS' || value.includes('invalid credentials')) return 'Email atau password yang kamu masukkan belum benar.'
  if (apiError.status >= 500) return 'alurin sedang mengalami kendala. Coba lagi beberapa saat.'
  const vague = /^(error|failed|request failed|internal error|terjadi kesalahan)[.!]?$/i.test(apiError.message.trim())
  return vague ? fallback : apiError.message || fallback
}

export function reportError(
  context: string,
  error: unknown,
  fallback = DEFAULT_API_ERROR.message,
) {
  console.error(`[alurin] ${context}`, error)
  return getUserFacingError(error, fallback)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readStatus(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function getApiError(error: unknown): ApiError {
  if (!isRecord(error)) {
    return DEFAULT_API_ERROR
  }

  const response = isRecord(error.response) ? error.response : null
  const responseData = isRecord(response?.data) ? response.data : null
  const responseText = readString(response?.data)

  return {
    status: readStatus(response?.status) ?? readStatus(error.status) ?? DEFAULT_API_ERROR.status,
    code:
      readString(responseData?.error_code) ??
      readString(responseData?.code) ??
      readString(error.code) ??
      DEFAULT_API_ERROR.code,
    message:
      readString(responseData?.message) ??
      responseText ??
      readString(error.message) ??
      DEFAULT_API_ERROR.message,
  }
}

export function createApiResponseError(status: number, data: unknown) {
  const apiError = getApiError({
      response: {
        status,
        data,
      },
    })
  if (typeof window !== 'undefined' && isApplicationAuthError(apiError)) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
  if (typeof window !== 'undefined' && UPGRADE_PLAN_ERROR_CODES.has(apiError.code)) {
    window.dispatchEvent(new CustomEvent(UPGRADE_PLAN_REQUIRED_EVENT, {
      detail: { message: apiError.message },
    }))
  }
  return new ApiResponseError(apiError)
}
