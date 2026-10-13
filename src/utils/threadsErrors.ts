import { getApiError } from './apiError'

export type ThreadsErrorAction = {
  action: 'reconnect' | 'retry' | 'connect' | 'error'
  message: string
}

export function getThreadsErrorAction(error: unknown): ThreadsErrorAction {
  const apiError = getApiError(error)

  switch (apiError.code) {
    case 'THREADS_RECONNECT_REQUIRED':
      return {
        action: 'reconnect',
        message: 'Koneksi Threads telah kedaluwarsa. Hubungkan kembali akun Anda.',
      }
    case 'THREADS_REFRESH_FAILED':
      return {
        action: 'retry',
        message: 'Koneksi Threads sedang tidak dapat diperbarui. Silakan coba kembali beberapa saat lagi.',
      }
    case 'THREADS_ACCOUNT_NOT_FOUND':
      return {
        action: 'connect',
        message: 'Akun Threads belum terhubung.',
      }
    default:
      return {
        action: 'error',
        message: apiError.message || 'Terjadi kesalahan pada koneksi Threads.',
      }
  }
}
