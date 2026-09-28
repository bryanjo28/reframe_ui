import { useState, type FormEvent } from 'react'

import { API_BASE_URL } from '../config/api'
import { requestForgotPassword } from '../services/passwordRecovery'

const SUCCESS_MESSAGE = 'Jika email terdaftar, link reset password telah dikirim'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      await requestForgotPassword(email, fetch, API_BASE_URL)
      setSuccessMessage(SUCCESS_MESSAGE)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal mengirim link reset password. Coba lagi.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card auth-recovery-card panel">
        <div className="auth-hero">
          <p className="eyebrow">Password Recovery</p>
          <h1>Forgot password?</h1>
          <p className="page-description">
            Masukkan email akunmu. Kami akan mengirimkan link untuk membuat password baru.
          </p>
        </div>

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

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field full-width">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              required
            />
          </label>

          <div className="auth-actions auth-recovery-actions">
            <a className="auth-secondary-link" href="/login">
              Kembali ke login
            </a>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Mengirim...' : 'Kirim link reset password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
