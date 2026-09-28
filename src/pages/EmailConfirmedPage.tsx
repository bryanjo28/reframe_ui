import { useEffect } from 'react'

import { clearAuthSession } from '../services/authService'

export function EmailConfirmedPage() {
  useEffect(() => {
    clearAuthSession()
    window.history.replaceState({}, document.title, '/email-confirmed')
  }, [])

  return (
    <div className="bootstrap-shell">
      <section className="panel bootstrap-card">
        <p className="eyebrow">Email Confirmation</p>
        <h1>Email berhasil diverifikasi</h1>
        <p className="page-description">Silakan login untuk melanjutkan ke workspace kamu.</p>
        <a className="primary-button auth-route-button" href="/login">
          Login
        </a>
      </section>
    </div>
  )
}
