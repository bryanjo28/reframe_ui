export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

export function buildApiUrl(path: string) {
  return new URL(path, API_BASE_URL)
}
