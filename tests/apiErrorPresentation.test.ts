import { describe, expect, it } from 'vitest'
import { createApiResponseError, getUserFacingError, SESSION_EXPIRED_EVENT } from '../src/utils/apiError'

describe('user-facing API errors', () => {
  it('keeps AI quota separate from login sessions', () => {
    expect(getUserFacingError({ status: 429, code: 'MONTHLY_AI_CREDITS_EXCEEDED', message: 'quota exhausted' }))
      .toContain('Token penggunaan kamu sudah habis')
  })

  it('explains connection, timeout, rate limit, and server failures', () => {
    expect(getUserFacingError(new TypeError('Failed to fetch'))).toContain('Koneksi internet bermasalah')
    expect(getUserFacingError({ status: 408, message: 'request timeout' })).toContain('lebih lama dari biasanya')
    expect(getUserFacingError({ status: 429, message: 'rate limit' })).toContain('Terlalu banyak permintaan')
    expect(getUserFacingError({ status: 503, message: 'Internal error' })).toContain('Reframe sedang mengalami kendala')
  })

  it('signals only clearly expired authenticated sessions', () => {
    let expired = 0
    window.addEventListener(SESSION_EXPIRED_EVENT, () => { expired += 1 })
    createApiResponseError(401, { error_code: 'TOKEN_EXPIRED', message: 'JWT expired' })
    createApiResponseError(429, { error_code: 'MONTHLY_AI_CREDITS_EXCEEDED', message: 'quota exhausted' })
    expect(expired).toBe(1)
  })
})
