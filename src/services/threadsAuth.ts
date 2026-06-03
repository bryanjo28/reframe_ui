import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

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
    throw new Error('Gagal mengambil authorization URL Threads.')
  }

  const data = (await response.json()) as ThreadsConnectResponse
  const authorizationUrl = data.authorizationUrl || data.data?.authorizationUrl

  if (!authorizationUrl) {
    throw new Error('Authorization URL Threads tidak tersedia.')
  }

  return authorizationUrl
}
