import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'
import { createApiResponseError } from '../utils/apiError'

type ThreadsConnectResponse = {
  authorizationUrl: string
  data?: {
    authorizationUrl?: string
  }
}

export async function getThreadsAuthorizationUrl() {
  const token = getCurrentAuthToken()

  if (!token) {
    throw new Error('Token login belum tersedia. Silakan login ulang.')
  }

  const url = buildApiUrl('/api/threads/connect')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildApiHeaders({
      additionalHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw createApiResponseError(response.status, data)
  }

  const data = (await response.json()) as ThreadsConnectResponse
  const authorizationUrl = data.authorizationUrl || data.data?.authorizationUrl

  if (!authorizationUrl) {
    throw new Error('Authorization URL Threads tidak tersedia.')
  }

  return authorizationUrl
}

export async function deleteThreadsConnection() {
  const token = getCurrentAuthToken()

  if (!token) {
    throw new Error('Token login belum tersedia. Silakan login ulang.')
  }

  const url = buildApiUrl('/api/threads/delete')

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: buildApiHeaders({
      additionalHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Gagal menghapus koneksi Threads.' }))
    throw createApiResponseError(response.status, data)
  }
}
