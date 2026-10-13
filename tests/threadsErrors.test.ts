import { describe, expect, it } from 'vitest'
import { ApiResponseError } from '../src/utils/apiError'
import { getThreadsErrorAction } from '../src/utils/threadsErrors'

describe('Threads error actions', () => {
  it.each([
    ['THREADS_RECONNECT_REQUIRED', 'reconnect', 'Koneksi Threads telah kedaluwarsa. Hubungkan kembali akun Anda.'],
    ['THREADS_REFRESH_FAILED', 'retry', 'Koneksi Threads sedang tidak dapat diperbarui. Silakan coba kembali beberapa saat lagi.'],
    ['THREADS_ACCOUNT_NOT_FOUND', 'connect', 'Akun Threads belum terhubung.'],
  ] as const)('maps %s to %s', (code, action, message) => {
    const error = new ApiResponseError({ status: 401, code, message: 'backend message' })
    expect(getThreadsErrorAction(error)).toEqual({ action, message })
  })

  it('preserves a useful unknown error message', () => {
    expect(getThreadsErrorAction(new Error('Publish sedang gagal'))).toEqual({
      action: 'error',
      message: 'Publish sedang gagal',
    })
  })
})
