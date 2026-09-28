type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export function parseRecoveryHash(hash: string) {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const accessToken = params.get('access_token') || ''
  const isValid = Boolean(accessToken) && params.get('type') === 'recovery'

  return {
    accessToken: isValid ? accessToken : '',
    isValid,
  }
}

export function validateResetPasswords(newPassword: string, confirmPassword: string) {
  if (newPassword.length < 8) {
    return 'Password minimal 8 karakter.'
  }

  if (newPassword !== confirmPassword) {
    return 'Konfirmasi password tidak sama.'
  }

  return ''
}

export async function requestForgotPassword(
  email: string,
  fetcher: Fetcher = fetch,
  apiBaseUrl = 'http://localhost:3000',
) {
  const response = await fetcher(new URL('/api/auth/forgot-password', apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error('Gagal mengirim link reset password. Coba lagi.')
  }
}

export async function requestResetPassword(
  accessToken: string,
  newPassword: string,
  confirmPassword: string,
  fetcher: Fetcher = fetch,
  apiBaseUrl = 'http://localhost:3000',
) {
  const response = await fetcher(new URL('/api/auth/reset-password', apiBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ newPassword, confirmPassword }),
  })

  if (!response.ok) {
    throw new Error('Gagal mengubah password. Coba lagi.')
  }
}
