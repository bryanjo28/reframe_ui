import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const PERSONA_CONFIGS_ENDPOINT = '/api/persona-configs'

export type PersonaConfigPayload = {
  persona: string
  targetAudience: string
  nicheTopicFocus: string
  contentStyle: string
  tone: string
  goal: string
  platform: string
}

export type PersonaConfigRecord = Partial<PersonaConfigPayload> & {
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

type ConfigListResponse =
  | PersonaConfigRecord[]
  | {
      data?: unknown
      items?: unknown
      personaConfigs?: unknown
      persona_configs?: unknown
    }

type ConfigItemResponse =
  | PersonaConfigRecord
  | {
      data?: unknown
      personaConfig?: unknown
      persona_config?: unknown
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapListResponse(response: ConfigListResponse): PersonaConfigRecord[] {
  if (Array.isArray(response)) {
    return response
  }

  const candidates = [response.data, response.items, response.personaConfigs, response.persona_configs]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as PersonaConfigRecord[]
    }
  }

  return []
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readNestedUserId(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  return (
    readString(value.id) ||
    readString(value.userId) ||
    readString(value.user_id) ||
    readString(value.ownerId) ||
    readString(value.owner_id) ||
    readString(value.createdByUserId) ||
    readString(value.created_by_user_id)
  )
}

function getRecordUserIdentifiers(record: PersonaConfigRecord) {
  const directIdentifiers = [
    record.userId,
    record.user_id,
    record.ownerId,
    record.owner_id,
    record.createdByUserId,
    record.created_by_user_id,
  ]
    .map((value) => readString(value))
    .filter((value): value is string => Boolean(value))

  const nestedIdentifiers = [
    readNestedUserId(record.user),
    readNestedUserId(record.owner),
    readNestedUserId(record.createdBy),
    readNestedUserId(record.created_by),
  ].filter((value): value is string => Boolean(value))

  return [...directIdentifiers, ...nestedIdentifiers]
}

function getRecordTimestamp(record: PersonaConfigRecord) {
  const rawTimestamp =
    readString(record.updatedAt) ||
    readString(record.updated_at) ||
    readString(record.createdAt) ||
    readString(record.created_at)

  if (!rawTimestamp) {
    return 0
  }

  const parsedTimestamp = Date.parse(rawTimestamp)

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0
}

function unwrapItemResponse(response: ConfigItemResponse): PersonaConfigRecord | null {
  if (isRecord(response)) {
    const candidates = [response.data, response.personaConfig, response.persona_config]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate as PersonaConfigRecord
      }
    }

    return response
  }

  return null
}

function isCurrentUserRecord(record: PersonaConfigRecord, userId: string) {
  return getRecordUserIdentifiers(record).some((value) => value === userId)
}

export async function listPersonaConfigs() {
  const headers = buildApiHeaders()

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildApiUrl(PERSONA_CONFIGS_ENDPOINT), {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil persona configs.')
  }

  const data = (await response.json()) as ConfigListResponse

  return unwrapListResponse(data)
}

export async function getPersonaConfigById(id: string) {
  const headers = buildApiHeaders()

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildApiUrl(`${PERSONA_CONFIGS_ENDPOINT}/${id}`), {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil persona config.')
  }

  const data = (await response.json()) as ConfigItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Persona config tidak ditemukan.')
  }

  return item
}

export async function createPersonaConfig(payload: PersonaConfigPayload) {
  const headers = buildApiHeaders({ withBody: true })

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildApiUrl(PERSONA_CONFIGS_ENDPOINT), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Gagal membuat persona config.')
  }

  const data = (await response.json()) as ConfigItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Respons create persona config tidak valid.')
  }

  return item
}

export async function updatePersonaConfig(id: string, payload: PersonaConfigPayload) {
  const headers = buildApiHeaders({ withBody: true })

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildApiUrl(`${PERSONA_CONFIGS_ENDPOINT}/${id}`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Gagal memperbarui persona config.')
  }

  const data = (await response.json()) as ConfigItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Respons update persona config tidak valid.')
  }

  return item
}

export async function deletePersonaConfig(id: string) {
  const headers = buildApiHeaders()

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildApiUrl(`${PERSONA_CONFIGS_ENDPOINT}/${id}`), {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    throw new Error('Gagal menghapus persona config.')
  }
}

export async function findPersonaConfigForUser(userId: string) {
  const configs = await listPersonaConfigs()

  if (!configs.length) {
    return null
  }

  const normalizedUserId = userId.trim()
  const exactMatch = configs.find((record) => isCurrentUserRecord(record, normalizedUserId))

  if (exactMatch) {
    return exactMatch
  }

  if (configs.length === 1) {
    return configs[0]
  }

  const latestRecord = [...configs].sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))[0]
  const hasOwnershipMetadata = getRecordUserIdentifiers(latestRecord).length > 0

  return hasOwnershipMetadata ? null : latestRecord
}
