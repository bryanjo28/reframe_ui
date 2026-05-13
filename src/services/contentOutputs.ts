import { buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const CONTENT_OUTPUTS_ENDPOINT = '/api/content-outputs/generate'
const CONTENT_OUTPUTS_LIST_ENDPOINT = '/api/content-outputs'
const CONTENT_OUTPUTS_DEMO_ENDPOINT = '/api/content-outputs/generate-demo'
const REQUEST_TIMEOUT_MS = 25000

export type CreateContentOutputPayload = {
  topicId: string
  platform: string
  formatOutput: string
  additionalPrompt: string
}

export type GenerateContentOutputDemoPayload = {
  persona?: string
  targetAudience?: string
  nicheTopicFocus?: string
  contentStyle?: string
  formatOutput?: string
}

export type AutoGenerateContentOutputsPayload = {
  contentPillarId: string
  targetCount: number
  scheduledAt: string
}

export type ContentOutputRecord = {
  id?: string
  userId?: string
  user_id?: string
  topicId?: string
  topic_id?: string
  topic?: string
  title?: string
  platform?: string
  formatOutput?: string
  format_output?: string
  additionalPrompt?: string
  additional_prompt?: string
  contentOutput?: string
  content_output?: string
  output?: string
  result?: string
  generatedAt?: string
  generated_at?: string
  createdAt?: string
  created_at?: string
  scheduledAt?: string
  scheduled_at?: string
  [key: string]: unknown
}

function buildHeaders(withBody = false) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (withBody) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function normalizeGenerateContentOutputDemoPayload(payload: GenerateContentOutputDemoPayload = {}) {
  return {
    persona: typeof payload.persona === 'string' ? payload.persona.trim() : '',
    targetAudience:
      typeof payload.targetAudience === 'string' ? payload.targetAudience.trim() : '',
    nicheTopicFocus:
      typeof payload.nicheTopicFocus === 'string' ? payload.nicheTopicFocus.trim() : '',
    contentStyle: typeof payload.contentStyle === 'string' ? payload.contentStyle.trim() : '',
    formatOutput: 'threads pendek',
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })

    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request generate content timeout. Coba lagi.')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function readResponseBodyWithTimeout(response: Response, timeoutMs = REQUEST_TIMEOUT_MS) {
  return await Promise.race([
    response.json().catch(async () => await response.text()),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request generate content timeout. Coba lagi.'))
      }, timeoutMs)
    }),
  ])
}

export async function createContentOutput(payload: CreateContentOutputPayload) {
  const requestBody: Record<string, unknown> = {
    topicId: payload.topicId,
    platform: payload.platform,
    formatOutput: payload.formatOutput,
    additionalPrompt: payload.additionalPrompt,
  }

  const response = await fetchWithTimeout(buildApiUrl(CONTENT_OUTPUTS_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(requestBody),
  })

  const data = await readResponseBodyWithTimeout(response)

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : 'Gagal generate content output.'

    throw new Error(errorMessage || 'Gagal generate content output.')
  }

  return data
}

export async function generateContentOutputDemo(payload: GenerateContentOutputDemoPayload = {}) {
  const response = await fetchWithTimeout(buildApiUrl(CONTENT_OUTPUTS_DEMO_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(normalizeGenerateContentOutputDemoPayload(payload)),
  })

  const data = await readResponseBodyWithTimeout(response)

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : 'Gagal generate demo content output.'

    throw new Error(errorMessage || 'Gagal generate demo content output.')
  }

  return data
}

export async function autoGenerateContentOutputs(payload: AutoGenerateContentOutputsPayload) {
  const response = await fetchWithTimeout(buildApiUrl('/api/content-outputs/auto-generate'), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({
      contentPillarId: payload.contentPillarId,
      targetCount: payload.targetCount,
      scheduledAt: payload.scheduledAt,
    }),
  })

  const data = await readResponseBodyWithTimeout(response)

  if (!response.ok) {
    const errorMessage =
      typeof data === 'string' ? data : 'Gagal auto-generate content outputs.'

    throw new Error(errorMessage || 'Gagal auto-generate content outputs.')
  }

  return data
}

function isContentOutputRecord(value: unknown): value is ContentOutputRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapContentOutputListResponse(response: unknown): ContentOutputRecord[] {
  if (Array.isArray(response)) {
    return response as ContentOutputRecord[]
  }

  if (!isContentOutputRecord(response)) {
    return []
  }

  const candidates = [
    response.data,
    response.items,
    response.contentOutputs,
    response.content_outputs,
    response.outputs,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as ContentOutputRecord[]
    }
  }

  return [response]
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function normalizeContentOutputRecord(record: ContentOutputRecord) {
  return {
    ...record,
    userId: asString(record.userId) || asString(record.user_id) || '',
    topicId: asString(record.topicId) || asString(record.topic_id) || '',
    topic: asString(record.topic) || asString(record.title) || '',
    platform: asString(record.platform) || '',
    formatOutput: asString(record.formatOutput) || asString(record.format_output) || '',
    additionalPrompt:
      asString(record.additionalPrompt) || asString(record.additional_prompt) || '',
    contentOutput: asString(record.contentOutput) || asString(record.content_output) || '',
    output: asString(record.output) || asString(record.result) || '',
    generatedAt: asString(record.generatedAt) || asString(record.generated_at) || '',
    createdAt: asString(record.createdAt) || asString(record.created_at) || '',
    scheduledAt: asString(record.scheduledAt) || asString(record.scheduled_at) || '',
  }
}

export async function listContentOutputs(userId?: string) {
  const response = await fetchWithTimeout(buildApiUrl(CONTENT_OUTPUTS_LIST_ENDPOINT), {
    method: 'GET',
    headers: buildHeaders(),
  })

  const data = await readResponseBodyWithTimeout(response)

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : 'Gagal mengambil content outputs.'

    throw new Error(errorMessage || 'Gagal mengambil content outputs.')
  }

  const normalized = unwrapContentOutputListResponse(data).map(normalizeContentOutputRecord)

  if (!userId) {
    return normalized
  }

  return normalized.filter((record) => {
    const ownerId = record.userId || record.user_id || ''
    return !ownerId || ownerId === userId
  })
}
