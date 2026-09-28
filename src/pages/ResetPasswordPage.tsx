import { useState, type FormEvent } from 'react'

import { API_BASE_URL } from '../config/api'
import {
  parseRecoveryHash,
  requestResetPassword,
  validateResetPasswords,
} from '../services/passwordRecovery'

type ResetPasswordPageProps = {
  onSuccess?: () => void
}

function finishPasswordReset() {
  window.history.replaceState({}, '', '/reset-password')
  window.location.href = '/login'
}

export function ResetPasswordPage({ onSuccess = finishPasswordReset }: ResetPasswordPageProps) {
  const [{ accessToken, isValid }] = useState(() => parseRecoveryHash(window.location.hash))
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateResetPasswords(newPassword, confirmPassword)

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await requestResetPassword(
        accessToken,
        newPassword,
        confirmPassword,
        fetch,
        API_BASE_URL,
      )
      onSuccess()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengubah password. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card auth-recovery-card panel">
        <div className="auth-hero">
          <p className="eyebrow">Password Recovery</p>
          <h1>Buat password baru</h1>
          <p className="page-description">Gunakan minimal 8 karakter untuk password barumu.</p>
        </div>

        {!isValid ? (
          <>
            <div className="integration-note integration-note-error" role="alert">
              <p>Link reset password tidak valid atau kedaluwarsa.</p>
            </div>
            <a className="auth-secondary-link" href="/forgot-password">
              Minta link reset baru
            </a>
          </>
        ) : (
          <>
            {errorMessage ? (
              <div className="integration-note integration-note-error" role="alert">
                <p>{errorMessage}</p>
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="auth-field full-width">
                <span>Password baru</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="auth-field full-width">
                <span>Konfirmasi password baru</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <div className="auth-actions">
                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Mengubah...' : 'Ubah password'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
