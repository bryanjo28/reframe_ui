import { buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const CONTENT_OUTPUTS_ENDPOINT = '/api/content-outputs/generate'
const CONTENT_OUTPUTS_DEMO_ENDPOINT = '/api/content-outputs/generate-demo'
const REQUEST_TIMEOUT_MS = 25000

export type CreateContentOutputPayload = {
  topicId: string
  promptTemplateId?: string
  platform: string
  formatOutput: string
  additionalPrompt: string
  improvementHint: string
}

export type GenerateContentOutputDemoPayload = {
  persona?: string
  targetAudience?: string
  nicheTopicFocus?: string
  contentStyle?: string
  formatOutput?: string
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
    improvementHint: payload.improvementHint,
  }

  if (payload.promptTemplateId?.trim()) {
    requestBody.promptTemplateId = payload.promptTemplateId.trim()
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
