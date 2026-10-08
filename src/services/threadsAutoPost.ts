import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const THREADS_AUTO_POST_ENDPOINT = '/api/threads/auto-post'
const SCHEDULED_JOBS_ENDPOINT = '/api/scheduled-jobs'

export type ScheduleThreadsAutoPostPayload = {
  contentOutputId: string
  scheduledAt: string
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
  progress?: ScheduledJobProgress
  lastRunStatus?: string
  lastRunError?: string
  errorMessage?: string
  [key: string]: unknown
}

export type ScheduledJobProgress = {
  status: string
  targetCount?: number
  fetchedCount?: number
  processedCount?: number
  successCount?: number
  failedCount?: number
  percentage?: number
  startedAt?: string | null
  finishedAt?: string | null
  errorMessage?: string
}

type ScheduledJobItemResponse =
  | ScheduledJobRecord
  | {
      data?: unknown
      item?: unknown
      scheduledJob?: unknown
      scheduled_job?: unknown
    }

type ScheduledJobListResponse =
  | ScheduledJobRecord[]
  | {
      data?: unknown
      items?: unknown
      scheduledJobs?: unknown
      scheduled_jobs?: unknown
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeProgress(value: unknown): ScheduledJobProgress | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    status: readString(value.status) || 'pending',
    targetCount: readNumber(value.targetCount),
    fetchedCount: readNumber(value.fetchedCount),
    processedCount: readNumber(value.processedCount),
    successCount: readNumber(value.successCount),
    failedCount: readNumber(value.failedCount),
    percentage: readNumber(value.percentage),
    startedAt: readString(value.startedAt) || null,
    finishedAt: readString(value.finishedAt) || null,
    errorMessage: readString(value.errorMessage) || readString(value.error_message),
  }
}

type ScheduledJobStatusSource = {
  status?: string
  lastRunStatus?: string
  progress?: Pick<ScheduledJobProgress, 'status'>
}

export function getScheduledJobRunStatus(job?: ScheduledJobStatusSource) {
  return job?.progress?.status || job?.lastRunStatus || job?.status || ''
}

export function isScheduledJobProgressTerminal(source?: ScheduledJobStatusSource) {
  if (!source) return false
  const terminalStatuses = ['completed', 'completed_with_errors', 'failed']
  return terminalStatuses.includes(source.status || '') ||
    terminalStatuses.includes(source.lastRunStatus || '') ||
    terminalStatuses.includes(source.progress?.status || '')
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

function unwrapScheduledJobListResponse(response: ScheduledJobListResponse): ScheduledJobRecord[] {
  if (Array.isArray(response)) {
    return response as ScheduledJobRecord[]
  }

  if (!isRecord(response)) {
    return []
  }

  const candidates = [response.data, response.items, response.scheduledJobs, response.scheduled_jobs]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as ScheduledJobRecord[]
    }
  }

  return []
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
      contentOutputId: payload.contentOutputId,
      scheduledAt: payload.scheduledAt,
    }),
  })

  const data = await response
    .json()
    .catch(async () => await response.text())

  if (!response.ok) {
    const errorMessage = typeof data === 'string'
      ? data
      : isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'Gagal menjadwalkan auto post.'
    throw new Error(errorMessage || 'Gagal menjadwalkan auto post.')
  }

  return data
}

export async function rescheduleThreadsContent(contentOutputId: string, scheduledAt: string) {
  const response = await fetch(buildApiUrl(`${THREADS_AUTO_POST_ENDPOINT}/${contentOutputId}`), {
    method: 'PATCH', headers: buildHeaders(true), body: JSON.stringify({ scheduledAt }),
  })
  const data = await response.json().catch(async () => await response.text())
  if (!response.ok) {
    const message = typeof data === 'string'
      ? data
      : isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'Gagal mengubah jadwal konten.'
    throw new Error(message)
  }
  return data
}

export async function cancelThreadsContentSchedule(contentOutputId: string) {
  const response = await fetch(buildApiUrl(`${THREADS_AUTO_POST_ENDPOINT}/${contentOutputId}`), {
    method: 'DELETE', headers: buildHeaders(),
  })
  const data = await response.json().catch(async () => await response.text())
  if (!response.ok) {
    const message = typeof data === 'string'
      ? data
      : isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'Gagal membatalkan jadwal konten.'
    throw new Error(message)
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

  return {
    ...scheduledJob,
    lastRunStatus: readString(scheduledJob.lastRunStatus) || readString(scheduledJob.last_run_status),
    lastRunError: readString(scheduledJob.lastRunError) || readString(scheduledJob.last_run_error),
    errorMessage: readString(scheduledJob.errorMessage) || readString(scheduledJob.error_message),
    progress: normalizeProgress(scheduledJob.progress),
  }
}

export async function listScheduledJobs() {
  const response = await fetch(buildApiUrl(SCHEDULED_JOBS_ENDPOINT), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Gagal mengambil scheduled jobs.'))
  }

  const data = (await response.json()) as ScheduledJobListResponse
  return unwrapScheduledJobListResponse(data)
}
