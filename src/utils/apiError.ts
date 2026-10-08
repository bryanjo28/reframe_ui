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
  message: 'Reframe sedang mengalami kendala. Coba lagi beberapa saat.',
}

export const SESSION_EXPIRED_EVENT = 'reframe:session-expired'

export function getUserFacingError(error: unknown, fallback = DEFAULT_API_ERROR.message) {
  if (error instanceof TypeError) return 'Koneksi internet bermasalah. Periksa koneksi kamu lalu coba lagi.'
  const apiError = getApiError(error)
  const value = `${apiError.code} ${apiError.message}`.toLowerCase()
  if (value.includes('quota') || value.includes('usage limit') || value.includes('token limit') || value.includes('insufficient credit')) return 'Token penggunaan kamu sudah habis. Lihat paket untuk melanjutkan.'
  if (value.includes('credit') && (value.includes('exceeded') || value.includes('habis'))) return 'Token penggunaan kamu sudah habis. Lihat paket untuk melanjutkan.'
  if (apiError.status === 429 || value.includes('rate limit')) return 'Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.'
  if (value.includes('timeout') || value.includes('timed out')) return 'Prosesnya memakan waktu lebih lama dari biasanya. Coba lagi dalam beberapa saat.'
  if (apiError.code === 'INVALID_CREDENTIALS' || value.includes('invalid credentials')) return 'Email atau password yang kamu masukkan belum benar.'
  if (apiError.status >= 500) return 'Reframe sedang mengalami kendala. Coba lagi beberapa saat.'
  const vague = /^(error|failed|request failed|internal error|terjadi kesalahan)[.!]?$/i.test(apiError.message.trim())
  return vague ? fallback : apiError.message || fallback
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
  // Every authenticated 401 means the current client session can no longer be
  // used. Do not depend on inconsistent backend error wording to sign out.
  if (typeof window !== 'undefined' && apiError.status === 401) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
  return new ApiResponseError(apiError)
}
