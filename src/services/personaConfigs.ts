import { buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const PERSONA_CONFIGS_ENDPOINT = '/api/persona-configs'

export type PersonaConfigPayload = {
  persona: string
  targetAudience: string
  nicheTopicFocus: string
  contentStyle: string
  tone: string
  goal: string
  posisiPersonaSaatIni: string
  audienceMasalahUtama: string
  apaYangMerekaRasakan: string
  kenapaHarusFollow: string
  gayaKomunikasi: string
  platform: string
  formatOutput: string
  gayaHook: string
  seberapaPersonal: string
  ctaStyle: string
  contentPillarPrioritas: string
  referensiGaya: string
  batasanKonten: string
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

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
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

function readRecordValue(record: PersonaConfigRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key])

    if (value) {
      return value
    }
  }

  return undefined
}

function isCurrentUserRecord(record: PersonaConfigRecord, userId: string) {
  const directMatches = [
    record.id,
    record.userId,
    record.user_id,
    record.ownerId,
    record.owner_id,
    record.createdByUserId,
    record.created_by_user_id,
  ].filter(Boolean)

  return directMatches.some((value) => value === userId)
}

export async function listPersonaConfigs() {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

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
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

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
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

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

  const exactMatch = configs.find((record) => isCurrentUserRecord(record, userId))

  if (exactMatch) {
    return exactMatch
  }

  if (configs.length === 1) {
    return configs[0]
  }

  const fallback = configs.find((record) =>
    readRecordValue(record, ['persona', 'persona_name', 'personaName']),
  )

  return fallback ?? null
}
