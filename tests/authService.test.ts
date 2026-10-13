import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAuthSession,
  getThreadsConnectionStatus,
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
      fullName: 'User Example',
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
        new Response(
          JSON.stringify({
            error_code: 'EMAIL_NOT_VERIFIED',
            message: 'Verifikasi email kamu sebelum login.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
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

  it('discards backend-managed Threads tokens from auth state', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'app-login-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        user: { id: 'user-1' },
        socialAccounts: {
          threads: {
            status: 'connected', connected: true, accountId: 'threads-1',
            accessToken: 'must-not-reach-fe', refreshToken: 'must-not-reach-fe', token: 'also-secret',
          },
        },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    const threads = (await getCurrentAuthState())?.socialAccounts?.threads
    expect(threads).toEqual(expect.objectContaining({ status: 'connected', connected: true, accountId: 'threads-1' }))
    expect(threads).not.toHaveProperty('accessToken')
    expect(threads).not.toHaveProperty('refreshToken')
    expect(threads).not.toHaveProperty('token')
  })

  it('discards token fields from a direct social account payload', async () => {
    clearAuthSession()
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'app-login-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        user: { id: 'user-1' },
        socialAccounts: {
          provider: 'threads', status: 'connected', accountId: 'threads-1',
          access_token: 'must-not-reach-fe', refresh_token: 'must-not-reach-fe',
        },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    const socialAccounts = (await getCurrentAuthState())?.socialAccounts
    expect(socialAccounts).not.toHaveProperty('access_token')
    expect(socialAccounts).not.toHaveProperty('refresh_token')
    expect(socialAccounts?.threads).toEqual(expect.objectContaining({ status: 'connected' }))
  })

  it('normalizes explicit and boolean Threads connection states', () => {
    expect(getThreadsConnectionStatus({ status: 'connected' })).toBe('connected')
    expect(getThreadsConnectionStatus({ connected: false, needsReconnect: true })).toBe('needs_reconnect')
    expect(getThreadsConnectionStatus({ status: 'needs_reconnect', connected: false })).toBe('needs_reconnect')
    expect(getThreadsConnectionStatus({ status: 'disconnected', connected: true })).toBe('disconnected')
    expect(getThreadsConnectionStatus(null)).toBe('disconnected')
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
