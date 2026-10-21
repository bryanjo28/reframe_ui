import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from './authService'

type FeedbackResult = { id: string; createdAt: string }

export async function submitFeedback(message: string, pagePath: string): Promise<FeedbackResult> {
  const token = getCurrentAuthToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch(buildApiUrl('/api/feedback'), {
    method: 'POST',
    headers: buildApiHeaders({
      withBody: true,
      additionalHeaders: { Authorization: `Bearer ${token}` },
    }),
    body: JSON.stringify({ message, pagePath }),
  })
  const payload = await response.json().catch(() => ({})) as { message?: string; data?: FeedbackResult }
  if (!response.ok) throw new Error(payload.message || 'Feedback could not be submitted. Please try again.')
  if (!payload.data?.id) throw new Error('The server did not confirm that your feedback was saved.')
  return payload.data
}
