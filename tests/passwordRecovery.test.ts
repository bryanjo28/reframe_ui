import { expect, test } from 'vitest'

import {
  parseRecoveryHash,
  requestForgotPassword,
  requestResetPassword,
  validateResetPasswords,
} from '../src/services/passwordRecovery.ts'

test('parseRecoveryHash accepts only a recovery access token', () => {
  expect(parseRecoveryHash('#access_token=token-123&type=recovery')).toEqual({
    accessToken: 'token-123',
    isValid: true,
  })
  expect(parseRecoveryHash('#access_token=token-123&type=signup')).toEqual({
    accessToken: '',
    isValid: false,
  })
  expect(parseRecoveryHash('#type=recovery')).toEqual({
    accessToken: '',
    isValid: false,
  })
})

test('validateResetPasswords rejects short and mismatched passwords', () => {
  expect(validateResetPasswords('1234567', '1234567')).toBe('Password minimal 8 karakter.')
  expect(validateResetPasswords('password-baru', 'password-lain')).toBe('Konfirmasi password tidak sama.')
  expect(validateResetPasswords('password-baru', 'password-baru')).toBe('')
})

test('requestForgotPassword posts the email as JSON', async () => {
  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = input.toString()
    capturedInit = init
    return new Response(null, { status: 200 })
  }

  await requestForgotPassword('user@example.com', fetcher, 'http://localhost:3000')

  expect(capturedUrl).toBe('http://localhost:3000/api/auth/forgot-password')
  expect(capturedInit?.method).toBe('POST')
  expect(capturedInit?.headers).toEqual({ 'Content-Type': 'application/json' })
  expect(capturedInit?.body).toBe(JSON.stringify({ email: 'user@example.com' }))
})

test('requestResetPassword posts both passwords with the recovery bearer token', async () => {
  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = input.toString()
    capturedInit = init
    return new Response(null, { status: 200 })
  }

  await requestResetPassword(
    'recovery-token',
    'password-baru',
    'password-baru',
    fetcher,
    'http://localhost:3000',
  )

  expect(capturedUrl).toBe('http://localhost:3000/api/auth/reset-password')
  expect(capturedInit?.headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Bearer recovery-token',
  })
  expect(capturedInit?.body).toBe(
    JSON.stringify({ newPassword: 'password-baru', confirmPassword: 'password-baru' }),
  )
})

test('password recovery requests surface backend failures', async () => {
  const fetcher = async () => new Response(null, { status: 500 })

  await expect(
    requestForgotPassword('user@example.com', fetcher, 'http://localhost:3000'),
  ).rejects.toThrow('Gagal mengirim link reset password')
  await expect(
    requestResetPassword(
      'recovery-token',
      'password-baru',
      'password-baru',
      fetcher,
      'http://localhost:3000',
    ),
  ).rejects.toThrow('Gagal mengubah password')
})
