import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const CONTENT_PILLARS_ENDPOINT = '/api/content-pillars'
const CONTENT_PILLARS_ENHANCE_ENDPOINT = `${CONTENT_PILLARS_ENDPOINT}/enhance`

export type ContentPillarPayload = {
  personaConfigId: string
  name: string
  templateContent: string
  targetObjective: string
  audienceSegment: string
  keyMessage: string
  ctaDirection: string
  affiliateLink: string
  aiEnhancedVersion?: string
  userReviewEdit?: string
}

export type ContentPillarEnhancePayload = ContentPillarPayload & {
  model: string
  maxTokens: number
  temperature: number
  systemPrompt: string
}

export type ContentPillarRecord = Partial<ContentPillarPayload> & {
  id?: string
  userId?: string
  user_id?: string
  ownerId?: string
  owner_id?: string
  createdByUserId?: string
  created_by_user_id?: string
  updatedAt?: string
  updated_at?: string
  createdAt?: string
  created_at?: string
  [key: string]: unknown
}

type ContentPillarListResponse =
  | ContentPillarRecord[]
  | {
      data?: unknown
      items?: unknown
      contentPillars?: unknown
      content_pillars?: unknown
    }

type ContentPillarItemResponse =
  | ContentPillarRecord
  | {
      data?: unknown
      contentPillar?: unknown
      content_pillar?: unknown
    }

type ContentPillarEnhanceResponse =
  | {
      contentPillar?: unknown
      enhancementInput?: unknown
      aiEnhancedVersion?: unknown
      model?: unknown
      systemPrompt?: unknown
      data?: unknown
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function unwrapListResponse(response: ContentPillarListResponse): ContentPillarRecord[] {
  if (Array.isArray(response)) {
    return response
  }

  const candidates = [response.data, response.items, response.contentPillars, response.content_pillars]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as ContentPillarRecord[]
    }
  }

  return []
}

function unwrapItemResponse(response: ContentPillarItemResponse): ContentPillarRecord | null {
  if (isRecord(response)) {
    const candidates = [response.data, response.contentPillar, response.content_pillar]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate as ContentPillarRecord
      }
    }

    return response
  }

  return null
}

type ContentPillarEnhanceResult = {
  contentPillar: ContentPillarRecord | null
  enhancementInput: Partial<ContentPillarEnhancePayload> | null
  aiEnhancedVersion: string
  model: string
  systemPrompt: string
}

function unwrapEnhanceResponse(response: ContentPillarEnhanceResponse): ContentPillarEnhanceResult {
  const root = isRecord(response) ? response : {}

  const contentPillar = isRecord(root.contentPillar)
    ? (root.contentPillar as ContentPillarRecord)
    : isRecord(root.data) && isRecord(root.data.contentPillar)
      ? (root.data.contentPillar as ContentPillarRecord)
      : null

  const enhancementInput = isRecord(root.enhancementInput)
    ? (root.enhancementInput as Partial<ContentPillarEnhancePayload>)
    : isRecord(root.data) && isRecord(root.data.enhancementInput)
      ? (root.data.enhancementInput as Partial<ContentPillarEnhancePayload>)
      : null

  const aiEnhancedVersion =
    asString(root.aiEnhancedVersion) ||
    (isRecord(root.data) ? asString(root.data.aiEnhancedVersion) : undefined) ||
    ''

  const model =
    asString(root.model) ||
    (isRecord(root.data) ? asString(root.data.model) : undefined) ||
    ''

  const systemPrompt =
    asString(root.systemPrompt) ||
    (isRecord(root.data) ? asString(root.data.systemPrompt) : undefined) ||
    ''

  return {
    contentPillar,
    enhancementInput,
    aiEnhancedVersion,
    model,
    systemPrompt,
  }
}

function readRecordValue(record: ContentPillarRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key])

    if (value) {
      return value
    }
  }

  return ''
}

function buildHeaders(withBody = false) {
  const headers = buildApiHeaders({ withBody })

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function normalizeListItem(record: ContentPillarRecord) {
  return {
    ...record,
    personaConfigId: readRecordValue(record, ['personaConfigId', 'persona_config_id']),
    name: readRecordValue(record, ['name', 'title', 'pillarName', 'pillar_name']),
    templateContent: readRecordValue(record, ['templateContent', 'template_content']),
    targetObjective: readRecordValue(record, ['targetObjective', 'target_objective']),
    audienceSegment: readRecordValue(record, ['audienceSegment', 'audience_segment']),
    keyMessage: readRecordValue(record, ['keyMessage', 'key_message']),
    ctaDirection: readRecordValue(record, ['ctaDirection', 'cta_direction']),
    affiliateLink: readRecordValue(record, ['affiliateLink', 'affiliate_link']),
    aiEnhancedVersion: readRecordValue(record, ['aiEnhancedVersion', 'ai_enhanced_version']),
    userReviewEdit: readRecordValue(record, ['userReviewEdit', 'user_review_edit']),
  }
}

function toRequestPayload(payload: ContentPillarPayload) {
  return {
    personaConfigId: payload.personaConfigId,
    pillarName: payload.name,
    templateContent: payload.templateContent,
    targetObjective: payload.targetObjective,
    audienceSegment: payload.audienceSegment,
    keyMessage: payload.keyMessage,
    ctaDirection: payload.ctaDirection,
    affiliateLink: payload.affiliateLink,
    ai_enhanced_version: payload.aiEnhancedVersion ?? '',
    user_review_edit: payload.userReviewEdit ?? '',
  }
}

export async function listContentPillars() {
  const response = await fetch(buildApiUrl(CONTENT_PILLARS_ENDPOINT), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil content pillars.')
  }

  const data = (await response.json()) as ContentPillarListResponse

  return unwrapListResponse(data).map(normalizeListItem)
}

export async function getContentPillarById(id: string) {
  const response = await fetch(buildApiUrl(`${CONTENT_PILLARS_ENDPOINT}/${id}`), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil content pillar.')
  }

  const data = (await response.json()) as ContentPillarItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Content pillar tidak ditemukan.')
  }

  return normalizeListItem(item)
}

export async function createContentPillar(payload: ContentPillarPayload) {
  const response = await fetch(buildApiUrl(CONTENT_PILLARS_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(toRequestPayload(payload)),
  })

  if (!response.ok) {
    throw new Error('Gagal membuat content pillar.')
  }

  const data = (await response.json()) as ContentPillarItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Respons create content pillar tidak valid.')
  }

  return normalizeListItem(item)
}

export async function updateContentPillar(id: string, payload: ContentPillarPayload) {
  const response = await fetch(buildApiUrl(`${CONTENT_PILLARS_ENDPOINT}/${id}`), {
    method: 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify(toRequestPayload(payload)),
  })

  if (!response.ok) {
    throw new Error('Gagal memperbarui content pillar.')
  }

  const data = (await response.json()) as ContentPillarItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Respons update content pillar tidak valid.')
  }

  return normalizeListItem(item)
}

export async function deleteContentPillar(id: string) {
  const response = await fetch(buildApiUrl(`${CONTENT_PILLARS_ENDPOINT}/${id}`), {
    method: 'DELETE',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal menghapus content pillar.')
  }
}

export async function enhanceContentPillar(id: string | undefined, payload: ContentPillarEnhancePayload) {
  const endpoint = id ? `${CONTENT_PILLARS_ENHANCE_ENDPOINT}/${id}` : CONTENT_PILLARS_ENHANCE_ENDPOINT

  const response = await fetch(buildApiUrl(endpoint), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Gagal enhance content pillar.')
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = (await response.json()) as ContentPillarEnhanceResponse
    return unwrapEnhanceResponse(data)
  }

  const text = await response.text()

  return unwrapEnhanceResponse({
    aiEnhancedVersion: text,
  })
}
