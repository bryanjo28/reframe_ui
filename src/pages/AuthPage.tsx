import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { login, register, type AuthSession } from '../services/authService'
import { getApiError } from '../utils/apiError'

type AuthMode = 'login' | 'register'
type AuthField = 'email' | 'fullName' | 'accountName' | 'password' | 'confirmPassword'
type AuthFieldErrors = Partial<Record<AuthField, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCOUNT_NAME_PATTERN = /^[a-z0-9._-]+$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})

  const clearAuthForm = useCallback(() => {
    setEmail('')
    setFullName('')
    setAccountName('')
    setPassword('')
    setConfirmPassword('')
    setErrorMessage('')
    setFieldErrors({})
  }, [])

  const switchMode = useCallback((nextMode: AuthMode) => {
    if (nextMode === mode) {
      return
    }

    setMode(nextMode)
    clearAuthForm()
  }, [clearAuthForm, mode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setFieldErrors({})

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedFullName = fullName.trim()
    const normalizedAccountName = accountName.trim().toLowerCase()
    const nextFieldErrors: AuthFieldErrors = {}

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Email wajib diisi.'
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextFieldErrors.email = 'Format email tidak valid.'
    }

    if (!password) {
      nextFieldErrors.password = 'Password wajib diisi.'
    }

    if (mode === 'register') {
      if (normalizedFullName.length < 2 || normalizedFullName.length > 100) {
        nextFieldErrors.fullName = 'Full name harus terdiri dari 2-100 karakter.'
      }

      if (normalizedAccountName.length < 3 || normalizedAccountName.length > 30) {
        nextFieldErrors.accountName = 'Username harus terdiri dari 3-30 karakter.'
      } else if (!ACCOUNT_NAME_PATTERN.test(normalizedAccountName)) {
        nextFieldErrors.accountName = 'Gunakan huruf, angka, titik, underscore, atau tanda hubung.'
      }

      if (password && !PASSWORD_PATTERN.test(password)) {
        nextFieldErrors.password = 'Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.'
      }

      if (!confirmPassword) {
        nextFieldErrors.confirmPassword = 'Konfirmasi password wajib diisi.'
      } else if (confirmPassword !== password) {
        nextFieldErrors.confirmPassword = 'Konfirmasi password tidak sama.'
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setEmail(normalizedEmail)
    if (mode === 'register') {
      setFullName(normalizedFullName)
      setAccountName(normalizedAccountName)
    }
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        const session = await login({ email: normalizedEmail, password })
        onAuthenticated(session, mode)
        return
      }

      const result = await register({
        email: normalizedEmail,
        fullName: normalizedFullName,
        accountName: normalizedAccountName,
        password,
      })

      if (result.emailConfirmationRequired) {
        onRegisterRequiresEmail?.(normalizedEmail)
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
          onEmailNotVerified?.(normalizedEmail)
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
    clearAuthForm()
  }, [clearAuthForm, initialMode])

  useEffect(() => {
    if (!allowRegister && mode !== 'login') {
      setMode('login')
      clearAuthForm()
    }
  }, [allowRegister, clearAuthForm, mode])

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
              switchMode('login')
            }}
          >
            Login
          </button>
          {allowRegister ? (
            <button
              type="button"
              className={`auth-tab${!isLogin ? ' active' : ''}`}
              onClick={() => {
                switchMode('register')
              }}
            >
              Register
            </button>
          ) : null}
        </div>

        {errorMessage ? <div className="integration-note integration-note-error"><p>{errorMessage}</p></div> : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isLogin || !allowRegister ? (
            <label className="auth-field full-width">
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
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                required
              />
              {fieldErrors.email ? (
                <small id="login-email-error" className="auth-field-error">
                  {fieldErrors.email}
                </small>
              ) : null}
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
                  onChange={(event) => {
                    setFullName(event.target.value)
                    setFieldErrors((current) => ({ ...current, fullName: undefined }))
                  }}
                  placeholder="nama lengkap kamu"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? 'register-full-name-error' : undefined}
                  required
                />
                {fieldErrors.fullName ? (
                  <small id="register-full-name-error" className="auth-field-error">
                    {fieldErrors.fullName}
                  </small>
                ) : null}
              </label>
              <label className="auth-field full-width">
                <span>Username</span>
                <input
                  value={accountName}
                  onChange={(event) => {
                    setAccountName(event.target.value)
                    setFieldErrors((current) => ({ ...current, accountName: undefined }))
                  }}
                  placeholder="username kamu"
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
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

          <div className={`auth-password-group${isLogin ? '' : ' auth-password-pair'}`}>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    password: undefined,
                    confirmPassword: undefined,
                  }))
                }}
                placeholder="Masukkan password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? undefined : 8}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                required
              />
              {fieldErrors.password ? (
                <small id="password-error" className="auth-field-error">
                  {fieldErrors.password}
                </small>
              ) : null}
            </label>
            {isLogin ? (
              <a className="auth-forgot-link" href="/forgot-password">
                Forgot password?
              </a>
            ) : password ? (
              <label className="auth-field">
                <span>Konfirmasi Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
                  }}
                  placeholder="Masukkan ulang password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                  required
                />
                {fieldErrors.confirmPassword ? (
                  <small id="confirm-password-error" className="auth-field-error">
                    {fieldErrors.confirmPassword}
                  </small>
                ) : null}
              </label>
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
