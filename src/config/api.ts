export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

export function buildApiUrl(path: string) {
  return new URL(path, API_BASE_URL)
}

type BuildApiHeadersOptions = {
  withBody?: boolean
  additionalHeaders?: Record<string, string>
}

export function buildApiHeaders(options: BuildApiHeadersOptions = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': '1',
    ...options.additionalHeaders,
  }

  if (options.withBody) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}
