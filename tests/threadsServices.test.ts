import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession } from '../src/services/authService'
import { retryContentOutputPost } from '../src/services/contentOutputs'
import { deleteThreadsConnection } from '../src/services/threadsAuth'
import { scheduleThreadsAutoPost } from '../src/services/threadsAutoPost'

const AUTH_TOKEN_STORAGE_KEY = 'reframe.authToken'

describe('Threads service errors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearAuthSession()
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'app-token')
  })

  it.each([
    ['schedule', () => scheduleThreadsAutoPost({ contentOutputId: 'output-1', scheduledAt: '2026-10-14T10:00:00.000Z' })],
    ['retry', () => retryContentOutputPost({ contentOutputId: 'output-1', scheduledAt: '2026-10-14T10:00:00.000Z' })],
    ['delete', () => deleteThreadsConnection()],
  ])('preserves the backend error code for %s', async (_name, request) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error_code: 'THREADS_RECONNECT_REQUIRED',
      message: 'Reconnect required',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } })))

    await expect(request()).rejects.toMatchObject({
      status: 401,
      code: 'THREADS_RECONNECT_REQUIRED',
      message: 'Reconnect required',
    })
  })
})
