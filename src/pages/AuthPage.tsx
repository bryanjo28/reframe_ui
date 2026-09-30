import { useEffect, useState, type FormEvent } from 'react'
import { login, register, type AuthSession } from '../services/authService'
import { getApiError } from '../utils/apiError'

type AuthMode = 'login' | 'register'
type AuthFieldErrors = Partial<Record<'email' | 'accountName', string>>

type AuthPageProps = {
  onAuthenticated: (session: AuthSession, mode: AuthMode) => void
  onRegisterRequiresEmail?: (email: string) => void
  onEmailNotVerified?: (email: string) => void
  initialMode?: AuthMode
  allowRegister?: boolean
  onBack?: () => void
  helperMessage?: string
}

export function AuthPage({
  onAuthenticated,
  onRegisterRequiresEmail,
  onEmailNotVerified,
  initialMode = 'login',
  allowRegister = true,
  onBack,
  helperMessage = '',
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setFieldErrors({})

    try {
      if (mode === 'login') {
        const session = await login({ email, password })
        onAuthenticated(session, mode)
        return
      }

      const result = await register({ email, fullName, accountName, password })

      if (result.emailConfirmationRequired) {
        onRegisterRequiresEmail?.(email)
        return
      }

      if (!result.session) {
        throw new Error('Register berhasil, tapi session belum tersedia. Silakan login.')
      }

      onAuthenticated(result.session, mode)
    } catch (error) {
      const apiError = getApiError(error)

      switch (apiError.code) {
        case 'EMAIL_NOT_VERIFIED':
          onEmailNotVerified?.(email)
          return
        case 'EMAIL_ALREADY_EXISTS':
          setFieldErrors({ email: apiError.message })
          return
        case 'ACCOUNT_NAME_ALREADY_EXISTS':
          setFieldErrors({ accountName: apiError.message })
          return
        case 'INVALID_CREDENTIALS':
          setErrorMessage(apiError.message)
          return
        default:
          setErrorMessage(apiError.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLogin = mode === 'login'

  useEffect(() => {
    setMode(initialMode)
    setErrorMessage('')
    setFieldErrors({})
  }, [initialMode])

  useEffect(() => {
    if (!allowRegister && mode !== 'login') {
      setMode('login')
      setErrorMessage('')
      setFieldErrors({})
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

        {helperMessage ? (
          <div className="integration-note">
            <p>{helperMessage}</p>
          </div>
        ) : null}

        <div className="auth-tabs" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={`auth-tab${isLogin ? ' active' : ''}`}
            onClick={() => {
              setMode('login')
              setErrorMessage('')
              setFieldErrors({})
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
                setFieldErrors({})
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
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                  }}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  required
                />
                {fieldErrors.email ? (
                  <small id="register-email-error" className="auth-field-error">
                    {fieldErrors.email}
                  </small>
                ) : null}
              </label>
              <label className="auth-field">
                <span>Full Name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="nama lengkap kamu"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Username</span>
                <input
                  value={accountName}
                  onChange={(event) => {
                    setAccountName(event.target.value)
                    setFieldErrors((current) => ({ ...current, accountName: undefined }))
                  }}
                  placeholder="username kamu"
                  autoComplete="username"
                  aria-invalid={Boolean(fieldErrors.accountName)}
                  aria-describedby={fieldErrors.accountName ? 'register-account-name-error' : undefined}
                  required
                />
                {fieldErrors.accountName ? (
                  <small id="register-account-name-error" className="auth-field-error">
                    {fieldErrors.accountName}
                  </small>
                ) : null}
              </label>
            </>
          )}

          <div className="auth-password-group">
            <label className="auth-field">
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
            {isLogin ? (
              <a className="auth-forgot-link" href="/forgot-password">
                Forgot password?
              </a>
            ) : null}
          </div>

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
