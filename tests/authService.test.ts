import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAuthSession,
  getCurrentAuthState,
  login,
  register,
  resendVerification,
} from '../src/services/authService'

const AUTH_TOKEN_STORAGE_KEY = 'reframe.authToken'

describe('authService verification flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearAuthSession()
    localStorage.clear()
  })

  it('reads nested emailConfirmationRequired and does not keep a register token', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stale-token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              emailConfirmationRequired: true,
              accessToken: 'must-not-be-saved',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const result = await register({
      email: 'user@example.com',
      accountName: 'user',
      password: 'password-baru',
    })

    expect(result).toEqual({ emailConfirmationRequired: true, session: null })
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('exposes EMAIL_NOT_VERIFIED from a rejected login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'EMAIL_NOT_VERIFIED' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(login({ email: 'user@example.com', password: 'password-baru' })).rejects.toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
    })
  })

  it('normalizes onboarding.hasPersona from auth me', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'access-token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              user: { id: 'user-1', email: 'user@example.com' },
              onboarding: { hasPersona: false },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const authState = await getCurrentAuthState()

    expect(authState?.onboarding).toEqual({ hasPersona: false })
  })

  it('resends verification to the registered email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await resendVerification('user@example.com')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3000/api/auth/resend-verification'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })
})
