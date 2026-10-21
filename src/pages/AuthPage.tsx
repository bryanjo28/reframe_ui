import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { login, register, type AuthSession } from '../services/authService'
import { getApiError, getUserFacingError, reportError } from '../utils/apiError'
import { AppIcon } from '../components/AppIcon'
import { BrandLogo } from '../components/BrandLogo'
import { clearReferralAttribution, getStoredReferralAttribution, saveReferralAttribution, validateReferralCode } from '../services/referrals'

type AuthMode = 'login' | 'register'
type AuthField = 'email' | 'fullName' | 'accountName' | 'password' | 'confirmPassword' | 'legalConsent'
type AuthFieldErrors = Partial<Record<AuthField, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCOUNT_NAME_PATTERN = /^[a-z0-9._-]+$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const TERMS_VERSION = '2026-10-20'
const PRIVACY_NOTICE_VERSION = '2026-10-20'

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
  const [legalConsentAccepted, setLegalConsentAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [referralCode, setReferralCode] = useState(() => getStoredReferralAttribution()?.code || '')
  const [referralMessage, setReferralMessage] = useState('')
  const [referralValid, setReferralValid] = useState(() => Boolean(getStoredReferralAttribution()))
  const [referralBonus, setReferralBonus] = useState<number | null>(() => getStoredReferralAttribution()?.referredBonusCredits ?? null)

  const clearAuthForm = useCallback(() => {
    setEmail('')
    setFullName('')
    setAccountName('')
    setPassword('')
    setConfirmPassword('')
    setLegalConsentAccepted(false)
    setShowPassword(false)
    setShowConfirmPassword(false)
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
      if (!legalConsentAccepted) {
        nextFieldErrors.legalConsent = 'Setujui Syarat & Ketentuan dan Pemberitahuan Privasi untuk membuat akun.'
      }

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

      let referralToken = getStoredReferralAttribution()?.token
      if (referralCode.trim() && !referralToken) {
        try {
          const validation = await validateReferralCode(referralCode)
          if (validation.valid) {
            const saved = saveReferralAttribution(validation)
            referralToken = saved?.token
            setReferralValid(Boolean(saved))
            setReferralMessage(validation.valid ? 'Kode referral tervalidasi.' : '')
          } else {
            setReferralMessage('Kode referral tidak valid. Pendaftaran dilanjutkan tanpa referral.')
          }
        } catch {
          setReferralMessage('Kode referral belum bisa diverifikasi. Pendaftaran dilanjutkan tanpa referral.')
        }
      }

      const result = await register({
        email: normalizedEmail,
        fullName: normalizedFullName,
        accountName: normalizedAccountName,
        password,
        acceptedTermsVersion: TERMS_VERSION,
        acceptedPrivacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        referralToken,
      })

      clearReferralAttribution()

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
      const errorSignature = `${apiError.code} ${apiError.message}`.toLowerCase()
      const emailAlreadyUsed =
        ['EMAIL_ALREADY_EXISTS', 'EMAIL_EXISTS', 'USER_ALREADY_EXISTS'].includes(apiError.code) ||
        (errorSignature.includes('email') && ['already', 'exists', 'registered', 'digunakan', 'terdaftar'].some((term) => errorSignature.includes(term)))
      const usernameAlreadyUsed =
        ['ACCOUNT_NAME_ALREADY_EXISTS', 'USERNAME_ALREADY_EXISTS', 'USERNAME_EXISTS'].includes(apiError.code) ||
        (['username', 'account name'].some((term) => errorSignature.includes(term)) && ['already', 'exists', 'taken', 'digunakan'].some((term) => errorSignature.includes(term)))

      if (mode === 'register' && emailAlreadyUsed) {
        const message = 'Email ini sudah terdaftar. Gunakan email lain atau login jika ini akun kamu.'
        setFieldErrors({ email: message })
        setErrorMessage(message)
        return
      }

      if (mode === 'register' && usernameAlreadyUsed) {
        const message = 'Username ini sudah dipakai. Coba gunakan username lain.'
        setFieldErrors({ accountName: message })
        setErrorMessage(message)
        return
      }

      switch (apiError.code) {
        case 'EMAIL_NOT_VERIFIED':
          onEmailNotVerified?.(normalizedEmail)
          return
        case 'EMAIL_ALREADY_EXISTS':
          setFieldErrors({ email: 'Email ini sudah terdaftar. Gunakan email lain atau login jika ini akun kamu.' })
          return
        case 'ACCOUNT_NAME_ALREADY_EXISTS':
          setFieldErrors({ accountName: 'Username ini sudah dipakai. Coba gunakan username lain.' })
          return
        case 'INVALID_CREDENTIALS':
          setErrorMessage(getUserFacingError(error))
          return
        default:
          setErrorMessage(reportError('Autentikasi', error, 'Login belum berhasil. Coba lagi.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLogin = mode === 'login'
  const isExpiredSessionMessage = helperMessage.startsWith('Session kamu sudah berakhir.')

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
      <section className={`auth-card panel ${isLogin ? 'auth-card-login' : 'auth-card-register'}`}>
        {onBack ? (
          <div className="auth-topbar">
            <button type="button" className="ghost-button auth-back-link" onClick={onBack}>
              Back
            </button>
          </div>
        ) : null}

        <div className="auth-hero">
          <BrandLogo className="auth-brand-logo" />
          <p className="eyebrow">alurin Access</p>
          <h1>{isLogin ? 'Login ke workspace kamu' : 'Register alurin'}</h1>
          <p className="page-description">
            {isLogin
              ? 'Login dengan email kamu untuk melanjutkan.'
              : 'Mulai perjalanan konten kamu.'}
          </p>
        </div>

        {helperMessage ? (
          <div className="auth-helper-note" role="status">
            <AppIcon name="info" />
            {isExpiredSessionMessage ? (
              <p><strong>Session kamu sudah berakhir.</strong><span>Silakan login kembali untuk melanjutkan.</span></p>
            ) : <p>{helperMessage}</p>}
          </div>
        ) : null}

        {errorMessage ? <div className="integration-note integration-note-error" role="alert"><p>{errorMessage}</p></div> : null}

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
                maxLength={254}
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
                  maxLength={254}
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

          {!isLogin && allowRegister ? (
            <div className="auth-referral-field full-width">
              <label className="auth-field" htmlFor="register-referral-code">
                <span>Punya kode referral?</span>
                <input
                  id="register-referral-code"
                  value={referralCode}
                  onChange={(event) => { setReferralCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)); setReferralValid(false); setReferralMessage('') }}
                  placeholder="Masukkan kode referral (opsional)"
                  autoComplete="off"
                  readOnly={referralValid}
                  maxLength={16}
                />
              </label>
              {!referralValid && referralCode.trim() ? <button type="button" className="ghost-button" onClick={async () => {
                setReferralMessage('Memeriksa kode...')
                try {
                  const validation = await validateReferralCode(referralCode)
                  if (!validation.valid) { setReferralMessage('Kode referral tidak valid atau program sedang tidak aktif.'); return }
                  const saved = saveReferralAttribution(validation)
                  setReferralCode(saved?.code || validation.code || referralCode)
                  setReferralValid(Boolean(saved))
                  setReferralBonus(validation.referredBonusCredits ?? null)
                  setReferralMessage(saved?.code === validation.code ? 'Kode referral valid. Referral pertama yang valid akan dipakai.' : 'Kode referral valid, tetapi referral pertama yang sudah tersimpan tetap digunakan.')
                } catch (error) { setReferralMessage(error instanceof Error ? error.message : 'Kode referral belum bisa diverifikasi.') }
              }}>Validasi kode</button> : null}
              {referralValid ? <p className="auth-referral-invitation"><strong>Kamu diundang untuk mencoba Alurin!</strong><span>Daftar sekarang dan dapatkan bonus {referralBonus ?? 10} AI Credits setelah pembelian paket pertamamu berhasil. Bonus masuk setelah periode validasi pembayaran.</span></p> : null}
              {referralMessage ? <small className="auth-referral-message" role="status">{referralMessage}</small> : null}
            </div>
          ) : null}

          <div className={`auth-password-group${isLogin ? '' : ' auth-password-pair'}`}>
            <label className="auth-field">
              <span>Password</span>
              <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
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
                maxLength={128}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                required
              />
              <button type="button" className="password-visibility" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}><AppIcon name={showPassword ? 'eye-off' : 'eye'} /></button>
              </div>
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
                <div className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
                  }}
                  placeholder="Masukkan ulang password"
                  autoComplete="new-password"
                  maxLength={128}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                  required
                />
                <button type="button" className="password-visibility" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}><AppIcon name={showConfirmPassword ? 'eye-off' : 'eye'} /></button>
                </div>
                {fieldErrors.confirmPassword ? (
                  <small id="confirm-password-error" className="auth-field-error">
                    {fieldErrors.confirmPassword}
                  </small>
                ) : null}
              </label>
            ) : null}
          </div>

          {!isLogin && allowRegister ? (
            <div className="auth-legal-consent">
              <label className="auth-legal-consent-label">
                <input
                  type="checkbox"
                  checked={legalConsentAccepted}
                  onChange={(event) => {
                    setLegalConsentAccepted(event.target.checked)
                    setFieldErrors((current) => ({ ...current, legalConsent: undefined }))
                  }}
                  aria-invalid={Boolean(fieldErrors.legalConsent)}
                  aria-describedby={fieldErrors.legalConsent ? 'register-legal-consent-error' : undefined}
                  required
                />
                <span>
                  Saya setuju dengan{' '}
                  <a href="/terms-of-service" target="_blank" rel="noreferrer">Syarat &amp; Ketentuan</a>
                  {' '}dan{' '}
                  <a href="/privacy-policy" target="_blank" rel="noreferrer">Pemberitahuan Privasi</a>
                  {' '}yang berlaku.
                </span>
              </label>
              {fieldErrors.legalConsent ? (
                <small id="register-legal-consent-error" className="auth-field-error" role="alert">
                  {fieldErrors.legalConsent}
                </small>
              ) : null}
            </div>
          ) : null}

          <div className="auth-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Memproses...' : isLogin ? 'Login' : 'Register'}
            </button>
          </div>
        </form>
        {allowRegister ? (
          <p className="auth-mode-switch">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button type="button" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        ) : null}
      </section>
    </div>
  )
}
