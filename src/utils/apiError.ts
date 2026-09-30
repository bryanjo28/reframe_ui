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
  message: 'Terjadi kesalahan. Silakan coba lagi.',
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
  return new ApiResponseError(
    getApiError({
      response: {
        status,
        data,
      },
    }),
  )
}
