import { buildApiUrl } from '../config/api'

type ThreadsConnectResponse = {
  authorizationUrl: string
}

export async function getThreadsAuthorizationUrl(userId: string) {
  const url = buildApiUrl('/api/threads/connect')
  url.searchParams.set('userId', userId)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil authorization URL Threads.')
  }

  const data = (await response.json()) as ThreadsConnectResponse

  if (!data.authorizationUrl) {
    throw new Error('Authorization URL Threads tidak tersedia.')
  }

  return data.authorizationUrl
}
