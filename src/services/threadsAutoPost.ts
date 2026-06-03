import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const THREADS_AUTO_POST_ENDPOINT = '/api/threads/auto-post'

export type ScheduleThreadsAutoPostPayload = {
  personaConfigId: string
  limit: number
  scheduledAt: string
}

function buildHeaders(withBody = false) {
  const headers = buildApiHeaders({ withBody })
  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export async function runThreadsAutoPost() {
  const response = await fetch(buildApiUrl(`${THREADS_AUTO_POST_ENDPOINT}/run`), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({}),
  })

  const data = await response
    .json()
    .catch(async () => await response.text())

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : 'Gagal menjalankan auto post job.'
    throw new Error(errorMessage || 'Gagal menjalankan auto post job.')
  }

  return data
}

export async function scheduleThreadsAutoPost(payload: ScheduleThreadsAutoPostPayload) {
  const response = await fetch(buildApiUrl(THREADS_AUTO_POST_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({
      personaConfigId: payload.personaConfigId,
      limit: payload.limit,
      scheduledAt: payload.scheduledAt,
    }),
  })

  const data = await response
    .json()
    .catch(async () => await response.text())

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : 'Gagal menjadwalkan auto post.'
    throw new Error(errorMessage || 'Gagal menjadwalkan auto post.')
  }

  return data
}
