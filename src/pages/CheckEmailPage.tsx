import { useState } from 'react'

import { resendVerification } from '../services/authService'
import { BrandLogo } from '../components/BrandLogo'

type CheckEmailPageProps = {
  email?: string
  onBackToLogin?: () => void
}

export function CheckEmailPage({ email, onBackToLogin }: CheckEmailPageProps) {
  const [isSending, setIsSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleResend() {
    if (!email) {
      return
    }

    setIsSending(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      await resendVerification(email)
      setSuccessMessage('Email verifikasi telah dikirim ulang.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal mengirim ulang email verifikasi. Coba lagi.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bootstrap-shell">
      <section className="panel bootstrap-card">
        <BrandLogo className="auth-brand-logo" />
        <p className="eyebrow">Check Email</p>
        <h1>Verifikasi email kamu terlebih dahulu</h1>
        <p className="page-description">
          Kami sudah mengirim link verifikasi ke{' '}
          <strong>{email || 'email yang kamu daftarkan'}</strong>. Buka email tersebut dan klik
          link verifikasi sebelum login.
        </p>
        <p className="page-description">
          Belum menemukan emailnya di kotak masuk? Cek folder Spam atau Junk. Jika tetap
          belum ada, klik tombol kirim ulang email verifikasi di bawah.
        </p>

        {successMessage ? (
          <div className="integration-note auth-message-success" role="status">
            <p>{successMessage}</p>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="integration-note integration-note-error" role="alert">
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="check-email-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => void handleResend()}
            disabled={!email || isSending}
          >
            {isSending ? 'Mengirim...' : 'Kirim ulang email verifikasi'}
          </button>
          <a className="auth-secondary-link" href="/login" onClick={onBackToLogin}>
            Kembali ke Login
          </a>
        </div>
      </section>
    </div>
  )
}
