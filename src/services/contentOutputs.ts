import { buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

const CONTENT_OUTPUTS_ENDPOINT = '/api/content-outputs/generate'

export type CreateContentOutputPayload = {
  topicId: string
  promptTemplateId?: string
  platform: string
  formatOutput: string
  additionalPrompt: string
  improvementHint: string
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

  const response = await fetch(buildApiUrl(CONTENT_OUTPUTS_ENDPOINT), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(requestBody),
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? ((await response.json()) as unknown)
    : await response.text()

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : 'Gagal generate content output.'

    throw new Error(errorMessage || 'Gagal generate content output.')
  }

  return data
}
