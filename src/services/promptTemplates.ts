import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const PROMPT_TEMPLATES_ENDPOINT = '/api/prompt-templates'

export type PromptTemplateRecord = {
  id?: string
  userId?: string
  user_id?: string
  ownerId?: string
  owner_id?: string
  name?: string
  title?: string
  description?: string
  prompt?: string
  template?: string
  systemPrompt?: string
  system_prompt?: string
  content?: string
  [key: string]: unknown
}

type PromptTemplateItemResponse =
  | PromptTemplateRecord
  | {
      data?: unknown
      promptTemplate?: unknown
      prompt_template?: unknown
    }

type PromptTemplateListResponse =
  | PromptTemplateRecord[]
  | {
      data?: unknown
      items?: unknown
      promptTemplates?: unknown
      prompt_templates?: unknown
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function unwrapItemResponse(response: PromptTemplateItemResponse): PromptTemplateRecord | null {
  if (isRecord(response)) {
    const candidates = [response.data, response.promptTemplate, response.prompt_template]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate as PromptTemplateRecord
      }
    }

    return response
  }

  return null
}

function unwrapListResponse(response: PromptTemplateListResponse): PromptTemplateRecord[] {
  if (Array.isArray(response)) {
    return response
  }

  const candidates = [response.data, response.items, response.promptTemplates, response.prompt_templates]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as PromptTemplateRecord[]
    }
  }

  return []
}

function readRecordValue(record: PromptTemplateRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key])

    if (value) {
      return value
    }
  }

  return ''
}

function buildHeaders() {
  const headers = buildApiHeaders()

  const token = getCurrentAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export function normalizePromptTemplate(record: PromptTemplateRecord) {
  return {
    ...record,
    name: readRecordValue(record, ['name', 'title', 'promptName', 'prompt_name']),
    description: readRecordValue(record, ['description', 'summary', 'excerpt']),
    prompt: readRecordValue(record, ['prompt', 'template', 'content', 'body']),
    systemPrompt: readRecordValue(record, ['systemPrompt', 'system_prompt']),
  }
}

export async function listPromptTemplates() {
  const response = await fetch(buildApiUrl(PROMPT_TEMPLATES_ENDPOINT), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil prompt templates.')
  }

  const data = (await response.json()) as PromptTemplateListResponse

  return unwrapListResponse(data).map(normalizePromptTemplate)
}

export async function getPromptTemplateById(id: string) {
  const response = await fetch(buildApiUrl(`${PROMPT_TEMPLATES_ENDPOINT}/${id}`), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil prompt template.')
  }

  const data = (await response.json()) as PromptTemplateItemResponse
  const item = unwrapItemResponse(data)

  if (!item) {
    throw new Error('Prompt template tidak ditemukan.')
  }

  return normalizePromptTemplate(item)
}
