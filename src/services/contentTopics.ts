import { buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const CONTENT_TOPICS_ENDPOINT = '/api/content-topics'
const CONTENT_TOPICS_GENERATE_ENDPOINT = '/api/content-topics/generate'

export type ContentTopicPayload = {
  userId: string
  personaConfigId: string
  contentPillarId: string
  category: string
  subcategory: string
  topic: string
  usedAt?: string
}

export type GenerateContentTopicsPayload = {
  contentPillarId: string
  templateText: string
  jumlahTopics: number
  templateId?: string
}

export type ContentTopicRecord = Partial<ContentTopicPayload> & {
  id?: string
  userId?: string
  user_id?: string
  personaConfigId?: string
  persona_config_id?: string
  contentPillarId?: string
  content_pillar_id?: string
  category?: string
  subcategory?: string
  topic?: string
  usedAt?: string
  used_at?: string
  createdAt?: string
  created_at?: string
  [key: string]: unknown
}

type ContentTopicItemResponse =
  | ContentTopicRecord
  | {
      data?: unknown
      contentTopic?: unknown
      content_topic?: unknown
    }

type ContentTopicListResponse =
  | ContentTopicRecord[]
  | {
      data?: unknown
      items?: unknown
      contentTopics?: unknown
      content_topics?: unknown
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function unwrapItemResponse(response: ContentTopicItemResponse): ContentTopicRecord | null {
  if (isRecord(response)) {
    const candidates = [response.data, response.contentTopic, response.content_topic]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate as ContentTopicRecord
      }
    }

    return response
  }

  return null
}

function unwrapListResponse(response: ContentTopicListResponse): ContentTopicRecord[] {
  if (Array.isArray(response)) {
    return response
  }

  const candidates = [response.data, response.items, response.contentTopics, response.content_topics]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as ContentTopicRecord[]
    }
  }

  return []
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

function toRequestPayload(payload: ContentTopicPayload) {
  return {
    userId: payload.userId,
    personaConfigId: payload.personaConfigId,
    contentPillarId: payload.contentPillarId,
    category: payload.category,
    subcategory: payload.subcategory,
    topic: payload.topic,
    usedAt: payload.usedAt,
  }
}

function normalizeRecord(record: ContentTopicRecord) {
  return {
    ...record,
    userId: asString(record.userId) || asString(record.user_id) || '',
    personaConfigId: asString(record.personaConfigId) || asString(record.persona_config_id) || '',
    contentPillarId: asString(record.contentPillarId) || asString(record.content_pillar_id) || '',
    category: asString(record.category) || '',
    subcategory: asString(record.subcategory) || '',
    topic: asString(record.topic) || '',
    usedAt: asString(record.usedAt) || asString(record.used_at) || '',
    createdAt: asString(record.createdAt) || asString(record.created_at) || '',
  }
}

function normalizeListRecord(record: ContentTopicRecord) {
  return normalizeRecord(record)
}

export async function listContentTopics() {
  const response = await fetch(buildApiUrl(CONTENT_TOPICS_ENDPOINT), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil content topics.')
  }

  const data = (await response.json()) as ContentTopicListResponse

  return unwrapListResponse(data).map(normalizeListRecord)
}

export async function getContentTopicById(id: string) {
  const response = await fetch(buildApiUrl(`${CONTENT_TOPICS_ENDPOINT}/${id}`), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil content topic.')
  }

  const data = (await response.json()) as ContentTopicItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Content topic tidak ditemukan.')
  }

  return normalizeRecord(item)
}

export async function createContentTopic(payload: ContentTopicPayload) {
  const response = await fetch(buildApiUrl(CONTENT_TOPICS_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(toRequestPayload(payload)),
  })

  if (!response.ok) {
    throw new Error('Gagal menyimpan content topic.')
  }

  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    return normalizeRecord(payload)
  }

  const data = (await response.json()) as ContentTopicItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Respons create content topic tidak valid.')
  }

  return normalizeRecord(item)
}

export async function generateContentTopics(payload: GenerateContentTopicsPayload) {
  const response = await fetch(buildApiUrl(CONTENT_TOPICS_GENERATE_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({
      contentPillarId: payload.contentPillarId,
      templateId: payload.templateId || '',
      templateText: payload.templateText,
      jumlahTopics: payload.jumlahTopics,
    }),
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? ((await response.json()) as unknown)
    : await response.text()

  if (!response.ok) {
    const errorMessage =
      typeof data === 'string' ? data : 'Gagal generate content topics.'

    throw new Error(errorMessage || 'Gagal generate content topics.')
  }

  return data
}
