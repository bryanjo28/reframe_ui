import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const THREADS_AUTO_POST_ENDPOINT = '/api/threads/auto-post'
const SCHEDULED_JOBS_ENDPOINT = '/api/scheduled-jobs'

export type ScheduleThreadsAutoPostPayload = {
  personaConfigId: string
  scheduledAt: string
  limit: number
}

export type ScheduledJobRecord = {
  id?: string
  userId?: string
  user_id?: string
  status?: string
  type?: string
  scheduledAt?: string
  scheduled_at?: string
  personaConfigId?: string
  persona_config_id?: string
  [key: string]: unknown
}

type ScheduledJobItemResponse =
  | ScheduledJobRecord
  | {
      data?: unknown
      item?: unknown
      scheduledJob?: unknown
      scheduled_job?: unknown
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function unwrapScheduledJobResponse(response: ScheduledJobItemResponse): ScheduledJobRecord | null {
  if (!isRecord(response)) {
    return null
  }

  const candidates = [response.data, response.item, response.scheduledJob, response.scheduled_job]

  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      return candidate as ScheduledJobRecord
    }
  }

  return response
}

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const responseText = await response.text()

  if (!responseText.trim()) {
    return fallbackMessage
  }

  try {
    const parsed = JSON.parse(responseText) as unknown

    if (isRecord(parsed)) {
      const candidate =
        readString(parsed.message) ||
        readString(parsed.error) ||
        readString(parsed.details) ||
        readString(parsed.detail) ||
        readString(parsed.title)

      if (candidate) {
        return candidate
      }
    }
  } catch {
    // Fall through to raw text.
  }

  return responseText.trim() || fallbackMessage
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
  const response = await fetch(buildApiUrl('/api/threads/auto-post/run'), {
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
      scheduledAt: payload.scheduledAt,
      limit: payload.limit,
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

export async function getScheduledJobById(id: string) {
  const response = await fetch(buildApiUrl(`${SCHEDULED_JOBS_ENDPOINT}/${id}`), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Gagal mengambil scheduled job.'))
  }

  const data = (await response.json()) as ScheduledJobItemResponse
  const scheduledJob = unwrapScheduledJobResponse(data)

  if (!scheduledJob) {
    throw new Error('Scheduled job tidak ditemukan.')
  }

  return scheduledJob
}
