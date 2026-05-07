import { useEffect, useState, type FormEvent } from 'react'
import { login, register, type AuthSession } from '../services/authService'

type AuthMode = 'login' | 'register'

type AuthPageProps = {
  onAuthenticated: (session: AuthSession) => void
  initialMode?: AuthMode
  allowRegister?: boolean
  onBack?: () => void
}

export function AuthPage({
  onAuthenticated,
  initialMode = 'login',
  allowRegister = true,
  onBack,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [accountName, setAccountName] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const session =
        mode === 'login'
          ? await login({ email, password })
          : await register({ email, accountName, password })

      onAuthenticated(session)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Auth gagal. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLogin = mode === 'login'

  useEffect(() => {
    setMode(initialMode)
    setErrorMessage('')
  }, [initialMode])

  useEffect(() => {
    if (!allowRegister && mode !== 'login') {
      setMode('login')
      setErrorMessage('')
    }
  }, [allowRegister, mode])

  return (
    <div className="auth-shell">
      <section className="auth-card panel">
        {onBack ? (
          <div className="auth-topbar">
            <button type="button" className="ghost-button auth-back-link" onClick={onBack}>
              Back
            </button>
          </div>
        ) : null}

        <div className="auth-hero">
          <p className="eyebrow">Reframe Access</p>
          <h1>{isLogin ? 'Login ke workspace kamu' : 'Buat akun baru dulu'}</h1>
          <p className="page-description">
            {isLogin
              ? 'Masuk dengan email, lalu sistem akan cek persona config sebelum kamu masuk dashboard.'
              : 'Daftar dulu supaya backend bisa simpan user profile dan persona config yang pertama.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={`auth-tab${isLogin ? ' active' : ''}`}
            onClick={() => {
              setMode('login')
              setErrorMessage('')
            }}
          >
            Login
          </button>
          {allowRegister ? (
            <button
              type="button"
              className={`auth-tab${!isLogin ? ' active' : ''}`}
              onClick={() => {
                setMode('register')
                setErrorMessage('')
              }}
            >
              Register
            </button>
          ) : null}
        </div>

        {errorMessage ? <div className="integration-note integration-note-error"><p>{errorMessage}</p></div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isLogin || !allowRegister ? (
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
          ) : (
            <>
              <label className="auth-field">
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
              <label className="auth-field">
                <span>Account Name</span>
                <input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="nama akun kamu"
                  autoComplete="name"
                  required
                />
              </label>
            </>
          )}

          <label className="auth-field full-width">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />
          </label>

          <div className="auth-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Memproses...' : isLogin ? 'Login' : 'Register'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
