import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { Sidebar } from './components/Sidebar'
import { AppIcon } from './components/AppIcon'
import { ManualPostPage } from './pages/ManualPostPage'
import { DashboardPage } from './pages/DashboardPage'
import { AutoPostPage } from './pages/AutoPostPage'
import { SubscriptionPlansPage } from './pages/SubscriptionPlansPage'
import { ConnectingAppsPage } from './pages/ConnectingAppsPage'
import { ThreadsCallbackPage } from './pages/ThreadsCallbackPage'
import { isThreadsCallbackSearch } from './utils/threadsCallback'
import { ContentEnginePage } from './pages/ContentEnginePage'
import { ContentBankPage } from './pages/ContentBankPage'
import { GenerateTopicPage } from './pages/GenerateTopicPage'
import { PersonalizePage } from './pages/PersonalizePage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { EmailConfirmedPage } from './pages/EmailConfirmedPage'
// Public /demo is temporarily disabled. Keep the page source available for later reuse.
// import { CreateContentDemoPage } from './pages/CreateContentDemoPage'
import type { AppTheme, NavKey } from './types/navigation'
import { ToastProvider } from './components/Toast'
import { ContentGenerationProgress } from './components/ContentGenerationProgress'
import { MobileNavigation } from './components/MobileNavigation'
import { CreateHubPage } from './pages/CreateHubPage'
import { TokenBalance } from './components/TokenBalance'
import { PaymentsPage } from './pages/PaymentsPage'
import { TopUpCreditsPage } from './pages/TopUpCreditsPage'
import { AiCreditsPage } from './pages/AiCreditsPage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingTutorial } from './components/OnboardingTutorial'
import { LegalPage } from './pages/LegalPage'
import { LandingPage } from './pages/LandingPage'
import { AdminDashboardPage } from './pages/Admin/AdminDashboardPage'
import { ReferralPage } from './pages/ReferralPage'
import { saveReferralAttribution, validateReferralCode } from './services/referrals'
import { watchLanguage, type UiLanguage } from './utils/uiLanguage'
import { reportError, SESSION_EXPIRED_EVENT, UPGRADE_PLAN_REQUIRED_EVENT } from './utils/apiError'
import {
  clearAuthSession,
  getCurrentAuthToken,
  getCurrentAuthState,
  getThreadsConnectionStatus,
  logout,
  type AuthUser,
  type ThreadsConnectionStatus,
} from './services/authService'
import {
  findPersonaConfigForUser,
  type PersonaConfigRecord,
} from './services/personaConfigs'
import {
  getScheduledJobById,
  getScheduledJobRunStatus,
  isScheduledJobProgressTerminal,
  type ScheduledJobProgress,
} from './services/threadsAutoPost'
import { notifyUsageChanged } from './services/usage'
import { listContentPillars } from './services/contentPillars'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error'

function getJwtExpiryTime(token?: string) {
  if (!token) return null

  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return null
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown }
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null
  } catch {
    return null
  }
}
type PersonaStatus = 'idle' | 'loading' | 'ready'
type UnauthenticatedView = 'login' | 'check-email'
const ACTIVE_PAGE_STORAGE_KEY = 'alurin.activePage'
const PENDING_VERIFICATION_EMAIL_STORAGE_KEY = 'alurin.pendingVerificationEmail'
const APP_THEME_STORAGE_KEY = 'alurin.appTheme'
const TUTORIAL_STORAGE_KEY = 'alurin:onboarding:tutorialCompleted'
const LANGUAGE_STORAGE_KEY = 'alurin.uiLanguage'
const AUTH_HELPER_STORAGE_KEY = 'alurin.authHelperMessage'
const APP_HISTORY_MARKER = 'alurin-workspace'

type AppHistoryState = {
  app?: string
  page?: NavKey
  boundary?: boolean
}

function getPagePath(page: NavKey) {
  if (page === 'admin') return '/admin'
  if (page === 'referral') return '/dashboard/referrals'
  return '/dashboard'
}

function isNavKey(value: unknown): value is NavKey {
  return typeof value === 'string' && [
    'dashboard', 'create', 'content-bank', 'personalize', 'create-persona-chat',
    'create-persona', 'content-pillar', 'generate-topic', 'content-engine',
    'manual-post', 'auto-post', 'subscription-plans', 'ai-credits', 'payments', 'top-up-credits',
    'connecting-apps', 'settings', 'referral', 'admin',
  ].includes(value)
}

function establishWorkspaceHistory(page: NavKey) {
  const currentState = window.history.state as AppHistoryState | null
  const path = getPagePath(page)

  if (currentState?.app === APP_HISTORY_MARKER) {
    window.history.replaceState({ ...currentState, page }, document.title, path)
    return
  }

  window.history.replaceState(
    { app: APP_HISTORY_MARKER, page: 'dashboard', boundary: true },
    document.title,
    '/dashboard',
  )
  window.history.pushState({ app: APP_HISTORY_MARKER, page }, document.title, path)
}

function pushWorkspaceHistory(page: NavKey) {
  const currentState = window.history.state as AppHistoryState | null
  if (currentState?.app !== APP_HISTORY_MARKER) {
    establishWorkspaceHistory(page)
    return
  }

  window.history.pushState(
    { app: APP_HISTORY_MARKER, page },
    document.title,
    getPagePath(page),
  )
}

function takeStoredAuthHelperMessage() {
  if (typeof sessionStorage === 'undefined') return ''
  const message = sessionStorage.getItem(AUTH_HELPER_STORAGE_KEY) || ''
  sessionStorage.removeItem(AUTH_HELPER_STORAGE_KEY)
  return message
}

function clearStoredAuthHelperMessage() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(AUTH_HELPER_STORAGE_KEY)
}

function getStoredTheme(): AppTheme {
  if (typeof localStorage === 'undefined') {
    return 'dark'
  }

  return localStorage.getItem(APP_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
}

function setStoredTheme(theme: AppTheme) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(APP_THEME_STORAGE_KEY, theme)
}

function getStoredPendingVerificationEmail() {
  if (typeof localStorage === 'undefined') {
    return ''
  }

  return localStorage.getItem(PENDING_VERIFICATION_EMAIL_STORAGE_KEY) || ''
}

function setStoredPendingVerificationEmail(email?: string) {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (email) {
    localStorage.setItem(PENDING_VERIFICATION_EMAIL_STORAGE_KEY, email)
  } else {
    localStorage.removeItem(PENDING_VERIFICATION_EMAIL_STORAGE_KEY)
  }
}

function getStoredActivePage(): NavKey {
  if (typeof window !== 'undefined' && window.location.pathname === '/dashboard/referrals') return 'referral'
  if (typeof localStorage === 'undefined') {
    return 'dashboard'
  }

  const value = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY)

  if (
    value === 'dashboard' ||
    value === 'create' ||
    value === 'personalize' ||
    value === 'create-persona-chat' ||
    value === 'create-persona' ||
    value === 'content-pillar' ||
    value === 'generate-topic' ||
    value === 'content-engine' ||
    value === 'manual-post' ||
    value === 'auto-post' ||
    value === 'subscription-plans' ||
    value === 'ai-credits' ||
    value === 'payments' ||
    value === 'top-up-credits' ||
    value === 'connecting-apps' ||
    value === 'settings'
  ) {
    return value
  }

  return 'dashboard'
}

function setStoredActivePage(page: NavKey) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, page)
}

function replaceAppPath(path: string) {
  if (window.location.pathname !== path || window.location.search || window.location.hash) {
    window.history.replaceState({}, document.title, path)
  }
}

function isRootEmailConfirmationCallback() {
  if (window.location.pathname !== '/') {
    return false
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const searchParams = new URLSearchParams(window.location.search)
  const callbackType = hashParams.get('type') || searchParams.get('type')

  return callbackType === 'signup' && Boolean(
    hashParams.get('access_token') || searchParams.get('token_hash') || searchParams.get('code'),
  )
}

function AppShell() {
  const isAuthCallbackRoute =
    typeof window !== 'undefined' && window.location.pathname === '/auth/callback'
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [isReferralRedirect, setIsReferralRedirect] = useState(() => /^\/ref\/[A-Za-z0-9]{8,16}\/?$/.test(window.location.pathname))
  const [authError, setAuthError] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [threadsStatus, setThreadsStatus] = useState<ThreadsConnectionStatus>('disconnected')
  const [unauthenticatedView, setUnauthenticatedView] = useState<UnauthenticatedView>('login')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(getStoredPendingVerificationEmail)
  const [authHelperMessage, setAuthHelperMessage] = useState(takeStoredAuthHelperMessage)
  const [activePage, setActivePage] = useState<NavKey>(getStoredActivePage)
  const [isSidebarMobile, setIsSidebarMobile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme)
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus>('idle')
  const [showAdminEntryChoice, setShowAdminEntryChoice] = useState(false)
  const [personaConfig, setPersonaConfig] = useState<PersonaConfigRecord | null>(null)
  const [isFirstSetup, setIsFirstSetup] = useState(() => window.location.pathname === '/first-setup')
  const [activeGenerationJobId, setActiveGenerationJobId] = useState('')
  const [generationProgress, setGenerationProgress] = useState<ScheduledJobProgress | null>(null)
  const [generationCompletion, setGenerationCompletion] = useState<{ jobId: string; status: string; errorMessage?: string } | null>(null)
  const [contentOutputsRefreshKey, setContentOutputsRefreshKey] = useState(0)
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true')
  const [language, setLanguage] = useState<UiLanguage>(() => localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'id')
  const [upgradePrompt, setUpgradePrompt] = useState('')
  const bootstrapRunIdRef = useRef(0)

  const completeTutorial = useCallback(() => { localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true'); setShowTutorial(false) }, [])

  useEffect(() => { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); return watchLanguage(language) }, [language])

  useEffect(() => {
    const handleSessionExpired = () => {
      const message = 'Session kamu sudah berakhir. Silakan login kembali untuk melanjutkan.'
      clearAuthSession()
      resetWorkspaceState()
      setUnauthenticatedView('login')
      sessionStorage.setItem(AUTH_HELPER_STORAGE_KEY, message)
      setAuthHelperMessage(message)
      setAuthStatus('unauthenticated')
      replaceAppPath('/login')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  useEffect(() => {
    const handleUpgradeRequired = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      setUpgradePrompt(detail?.message || 'Fitur ini membutuhkan paket berlangganan. Upgrade paket untuk melanjutkan.')
    }
    window.addEventListener(UPGRADE_PLAN_REQUIRED_EVENT, handleUpgradeRequired)
    return () => window.removeEventListener(UPGRADE_PLAN_REQUIRED_EVENT, handleUpgradeRequired)
  }, [])

  useEffect(() => {
    if (authStatus !== 'authenticated') return

    const expiryTime = getJwtExpiryTime(getCurrentAuthToken())
    if (!expiryTime) return

    let timeoutId: number | undefined
    const expireIfNeeded = () => {
      if (Date.now() >= expiryTime) {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
        return true
      }
      return false
    }
    const scheduleExpiry = () => {
      if (expireIfNeeded()) return
      const delay = Math.min(Math.max(expiryTime - Date.now(), 0), 2_147_000_000)
      timeoutId = window.setTimeout(() => {
        if (!expireIfNeeded()) scheduleExpiry()
      }, delay)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') expireIfNeeded()
    }

    scheduleExpiry()
    window.addEventListener('focus', expireIfNeeded)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('focus', expireIfNeeded)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [authStatus])

  useEffect(() => {
    if (!activeGenerationJobId) {
      return
    }

    let isCancelled = false
    let pollTimeoutId: number | undefined
    async function pollJob() {
      try {
        const job = await getScheduledJobById(activeGenerationJobId)

        if (isCancelled) {
          return
        }

        if (job.progress) {
          setGenerationProgress(job.progress)
        }

        if (isScheduledJobProgressTerminal(job)) {
          const runStatus = getScheduledJobRunStatus(job)
          const errorMessage = job.progress?.errorMessage || job.lastRunError || job.errorMessage
          if (runStatus === 'completed') {
            setContentOutputsRefreshKey((current) => current + 1)
          }
          notifyUsageChanged(job)
          setActiveGenerationJobId('')
          setGenerationProgress(null)
          setGenerationCompletion({ jobId: activeGenerationJobId, status: runStatus, errorMessage })
          return
        }
      } catch {
        // Keep the current progress visible and retry transient polling failures.
      }

      if (!isCancelled) {
        pollTimeoutId = window.setTimeout(pollJob, 2000)
      }
    }

    void pollJob()

    return () => {
      isCancelled = true
      window.clearTimeout(pollTimeoutId)
    }
  }, [activeGenerationJobId])

  const handleScheduledJobCreated = useCallback((jobId: string, targetCount: number) => {
    setGenerationCompletion(null)
    setActiveGenerationJobId(jobId)
    setGenerationProgress({
      status: 'pending',
      targetCount,
      fetchedCount: 0,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      percentage: 0,
      startedAt: null,
      finishedAt: null,
    })
  }, [])

  const handleGenerationCompletionHandled = useCallback(() => {
    setGenerationCompletion(null)
  }, [])

  const loadPersonaConfig = useCallback(async (userId: string, runId?: number) => {
    const activeRunId = runId ?? ++bootstrapRunIdRef.current
    setPersonaStatus('loading')

    try {
      const config = await findPersonaConfigForUser(userId)

      if (activeRunId !== bootstrapRunIdRef.current) {
        return
      }

      setPersonaConfig(config)
      setPersonaStatus('ready')
      return config
    } catch {
      if (activeRunId !== bootstrapRunIdRef.current) {
        return
      }

      setPersonaConfig(null)
      setPersonaStatus('ready')
      return null
    }
  }, [])

  function resetWorkspaceState() {
    setIsFirstSetup(false)
    setShowAdminEntryChoice(false)
    setCurrentUser(null)
    setThreadsStatus('disconnected')
    setPersonaConfig(null)
    setActivePage('dashboard')
    setPersonaStatus('idle')
    setActiveGenerationJobId('')
    setGenerationProgress(null)
  }

  const hydrateAuthState = useCallback(async () => {
    const runId = ++bootstrapRunIdRef.current
    setAuthStatus('loading')
    setAuthError('')

    try {
      const authState = await getCurrentAuthState()

      if (runId !== bootstrapRunIdRef.current) {
        return
      }

      if (!authState) {
        clearAuthSession()
        resetWorkspaceState()
        setUnauthenticatedView('login')
        setAuthStatus('unauthenticated')
        return
      }

      const { user, onboarding, socialAccounts } = authState
      setCurrentUser(user)
      setThreadsStatus(getThreadsConnectionStatus(socialAccounts?.threads))
      setStoredPendingVerificationEmail(undefined)
      setPendingVerificationEmail('')
      clearStoredAuthHelperMessage()
      setAuthHelperMessage('')
      setAuthStatus('authenticated')

      if (window.location.pathname.startsWith('/admin')) {
        if (user.role === 'admin') {
          setActivePage('admin')
          setPersonaStatus('ready')
          establishWorkspaceHistory('admin')
          return
        }
        setActivePage('dashboard')
        replaceAppPath('/dashboard')
      }

      if (onboarding?.hasPersona === false) {
        setIsFirstSetup(true)
        setPersonaConfig(null)
        setPersonaStatus('ready')
        replaceAppPath('/first-setup')
        return
      }

      const config = await loadPersonaConfig(user.id, runId)

      if (runId === bootstrapRunIdRef.current) {
        if (!config) {
          setIsFirstSetup(true)
          replaceAppPath('/first-setup')
        } else if (window.location.pathname === '/first-setup') {
          // If the lookup fails, keep setup open rather than ending a valid session.
          const pillars = await listContentPillars().catch(() => [])
          if (runId !== bootstrapRunIdRef.current) return
          if (!pillars.some((pillar) => (pillar.personaConfigId || pillar.persona_config_id) === config.id)) {
            setIsFirstSetup(true)
            setActivePage('content-pillar')
          } else {
            setIsFirstSetup(false)
            setActivePage('dashboard')
            establishWorkspaceHistory('dashboard')
          }
        } else if (window.location.pathname !== '/connecting-apps' && !window.location.pathname.startsWith('/admin')) {
          replaceAppPath('/dashboard')
          establishWorkspaceHistory(getStoredActivePage())
        } else if (window.location.pathname === '/connecting-apps') {
          establishWorkspaceHistory('connecting-apps')
        }
      }
    } catch (error) {
      if (runId !== bootstrapRunIdRef.current) {
        return
      }

      clearAuthSession()
      resetWorkspaceState()
      setAuthError(reportError('Memuat session auth', error, 'Session belum bisa dimuat. Coba lagi.'))
      setAuthStatus('error')
    }
  }, [loadPersonaConfig])

  useEffect(() => {
    if (isAuthCallbackRoute) {
      return
    }

    void hydrateAuthState()
  }, [hydrateAuthState, isAuthCallbackRoute])

  useEffect(() => {
    setStoredActivePage(activePage)
  }, [activePage])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    const handleWorkspaceBack = (event: PopStateEvent) => {
      const state = event.state as AppHistoryState | null

      if (state?.app !== APP_HISTORY_MARKER) {
        establishWorkspaceHistory('dashboard')
        setActivePage('dashboard')
        return
      }

      const page = isNavKey(state.page) ? state.page : 'dashboard'
      setActivePage(page)

      if (state.boundary) {
        window.history.pushState(
          { app: APP_HISTORY_MARKER, page: 'dashboard' },
          document.title,
          '/dashboard',
        )
      }
    }

    window.addEventListener('popstate', handleWorkspaceBack)
    return () => window.removeEventListener('popstate', handleWorkspaceBack)
  }, [authStatus])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.theme = theme
    setStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(max-width: 920px)')

    const syncSidebarMode = (matches: boolean) => {
      setIsSidebarMobile(matches)
      setIsSidebarOpen(false)

      if (matches) {
        setIsSidebarCollapsed(false)
      }
    }

    syncSidebarMode(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarMode(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    if (!isSidebarMobile || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSidebarMobile, isSidebarOpen])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hasThreadsCallbackState =
      searchParams.has('connected') || searchParams.has('error')

    if (hasThreadsCallbackState) {
      setActivePage('connecting-apps')
    }
  }, [])

  useEffect(() => {
    const match = window.location.pathname.match(/^\/ref\/([A-Za-z0-9]{8,16})\/?$/)
    if (!match) return
    let active = true
    const finish = (path: string) => {
      if (!active) return
      window.history.replaceState({}, document.title, path)
      setIsReferralRedirect(false)
    }
    if (getCurrentAuthToken()) {
      finish('/dashboard')
      return () => { active = false }
    }
    void validateReferralCode(match[1], true).then(validation => {
      if (validation.valid) saveReferralAttribution(validation)
      finish('/register')
    }).catch(() => finish('/register'))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!isAuthCallbackRoute) {
      return
    }

    clearAuthSession()
    resetWorkspaceState()
    setUnauthenticatedView('login')
    setStoredPendingVerificationEmail(undefined)
    setPendingVerificationEmail('')
    setAuthHelperMessage('Email berhasil diverifikasi. Silakan login untuk masuk ke dashboard.')
    setAuthStatus('unauthenticated')
    window.history.replaceState({}, document.title, '/')
  }, [isAuthCallbackRoute])

  const handleAuthenticated = useCallback(async () => {
    const runId = ++bootstrapRunIdRef.current
    setAuthStatus('loading')
    setAuthError('')

    try {
      const authState = await getCurrentAuthState()

      if (runId !== bootstrapRunIdRef.current) return
      if (!authState) {
        throw new Error('Session login tidak tersedia.')
      }

      setCurrentUser(authState.user)
      setThreadsStatus(getThreadsConnectionStatus(authState.socialAccounts?.threads))
      setAuthStatus('authenticated')
      setUnauthenticatedView('login')
      setStoredPendingVerificationEmail(undefined)
      setPendingVerificationEmail('')
      clearStoredAuthHelperMessage()
      setAuthHelperMessage('')
      const shouldOfferAdminEntry = authState.user.role === 'admin'
      setShowAdminEntryChoice(shouldOfferAdminEntry)
      if (window.location.pathname.startsWith('/admin')) {
        replaceAppPath('/dashboard')
      }
      setActivePage('dashboard')

      if (authState.onboarding?.hasPersona === false) {
        setIsFirstSetup(true)
        setPersonaConfig(null)
        setPersonaStatus('ready')
        if (!shouldOfferAdminEntry) replaceAppPath('/first-setup')
        return
      }

      const config = await loadPersonaConfig(authState.user.id, runId)

      if (runId === bootstrapRunIdRef.current) {
        if (shouldOfferAdminEntry) {
          setPersonaConfig(config ?? null)
          setPersonaStatus('ready')
        } else {
          setIsFirstSetup(!config)
          replaceAppPath(config ? '/dashboard' : '/first-setup')
          if (config) establishWorkspaceHistory('dashboard')
        }
      }
    } catch (error) {
      if (runId !== bootstrapRunIdRef.current) return
      clearAuthSession()
      resetWorkspaceState()
      setAuthError(reportError('Memuat session setelah login', error, 'Session login belum bisa dimuat. Coba lagi.'))
      setAuthStatus('error')
    }
  }, [loadPersonaConfig])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      clearAuthSession()
    } finally {
      resetWorkspaceState()
      setUnauthenticatedView('login')
      clearStoredAuthHelperMessage()
      setAuthHelperMessage('')
      setAuthStatus('unauthenticated')
      replaceAppPath('/login')
    }
  }, [])

  function handlePersonalizePersonaSaved(nextConfig: PersonaConfigRecord) {
    const continueFirstSetup = isFirstSetup || !personaConfig
    setIsFirstSetup(continueFirstSetup)
    setPersonaConfig(nextConfig)
    setActivePage('content-pillar')
    if (continueFirstSetup) replaceAppPath('/first-setup')
    else pushWorkspaceHistory('content-pillar')
  }

  function completeFirstSetup() {
    setIsFirstSetup(false)
    setActivePage('dashboard')
    establishWorkspaceHistory('dashboard')
  }

  const handleNavigate = useCallback((page: NavKey) => {
    if (page !== activePage) {
      pushWorkspaceHistory(page)
    }
    setActivePage(page)

    if (isSidebarMobile) {
      setIsSidebarOpen(false)
      setIsMoreOpen(false)
    }
  }, [activePage, isSidebarMobile])

  let content: ReactNode

  if (authStatus === 'loading' || isReferralRedirect) {
    content = (
      <div className="bootstrap-shell">
        <section className="bootstrap-loading" aria-live="polite">
          <h1>Memuat dashboard...</h1>
        </section>
      </div>
    )
  } else if (authStatus === 'error') {
    content = (
      <div className="bootstrap-shell">
        <section className="panel bootstrap-card">
          <p className="eyebrow">Bootstrapping</p>
          <h1>Gagal memeriksa session</h1>
          <p className="page-description">{authError}</p>
          <button className="primary-button" type="button" onClick={() => void hydrateAuthState()}>
            Coba lagi
          </button>
        </section>
      </div>
    )
  } else if (authStatus === 'unauthenticated') {
    content = unauthenticatedView === 'check-email' ? (
      <CheckEmailPage
        email={pendingVerificationEmail}
        onBackToLogin={() => {
          setUnauthenticatedView('login')
          setAuthHelperMessage('Setelah verifikasi email selesai, login dulu untuk masuk ke dashboard.')
        }}
      />
    ) : (
      <AuthPage
        onAuthenticated={() => void handleAuthenticated()}
        onRegisterRequiresEmail={(email) => {
          setStoredPendingVerificationEmail(email)
          setPendingVerificationEmail(email)
          setUnauthenticatedView('check-email')
          setAuthHelperMessage('')
          replaceAppPath('/check-email')
        }}
        onEmailNotVerified={(email) => {
          setStoredPendingVerificationEmail(email)
          setPendingVerificationEmail(email)
          setUnauthenticatedView('check-email')
          setAuthHelperMessage('')
          replaceAppPath('/check-email')
        }}
        initialMode={window.location.pathname === '/register' ? 'register' : 'login'}
        allowRegister
        helperMessage={authHelperMessage}
      />
    )
  } else if (showAdminEntryChoice && currentUser?.role === 'admin') {
    content = (
      <main className="admin-entry-shell">
        <section className="admin-entry-card" aria-labelledby="admin-entry-title">
          <p className="eyebrow">Akun administrator</p>
          <h1 id="admin-entry-title">Mau masuk ke mana?</h1>
          <p className="admin-entry-description">Pilih dashboard yang ingin kamu buka. Kamu bisa berpindah kapan saja.</p>
          <div className="admin-entry-options">
            <button className="admin-entry-option" type="button" onClick={() => { setShowAdminEntryChoice(false); setActivePage('dashboard'); if (personaConfig) establishWorkspaceHistory('dashboard'); else replaceAppPath('/first-setup') }}>
              <span className="admin-entry-option-icon" aria-hidden="true">⌂</span>
              <span><strong>Dashboard Pengguna</strong><small>Buat konten dan kelola workspace kamu</small></span>
              <span className="admin-entry-arrow" aria-hidden="true">→</span>
            </button>
            <button className="admin-entry-option admin-entry-option-primary" type="button" onClick={() => { setShowAdminEntryChoice(false); setActivePage('admin'); setPersonaStatus('ready'); establishWorkspaceHistory('admin') }}>
              <span className="admin-entry-option-icon" aria-hidden="true">▦</span>
              <span><strong>Admin Dashboard</strong><small>Kelola pengguna, paket, dan aktivitas</small></span>
              <span className="admin-entry-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>
    )
  } else if (activePage === 'admin' && currentUser?.role === 'admin') {
    content = <main className="content-area admin-content-area"><AdminDashboardPage onBackToUser={() => { setActivePage('dashboard'); replaceAppPath('/dashboard') }} onLogout={handleLogout} /></main>
  } else if (personaStatus === 'loading' || personaStatus === 'idle') {
    content = (
      <div className="bootstrap-shell">
        <section className="bootstrap-loading" aria-live="polite">
          <h1>Memuat dashboard...</h1>
        </section>
      </div>
    )
  } else if (!personaConfig || isFirstSetup) {
    content = (
      <main className="content-area setup-mode setup-immersive">
        <div className="page-transition">
          <PersonalizePage
            key={personaConfig ? 'setup-content-pillar' : 'setup-persona'}
            personaConfig={personaConfig}
            language={language}
            onPersonaSaved={handlePersonalizePersonaSaved}
            initialTab={personaConfig ? 'content-pillar' : 'persona'}
            onPillarSaved={completeFirstSetup}
          />
        </div>
      </main>
    )
  } else {
    content = (
      <div className={`dashboard-shell${isSidebarCollapsed && !isSidebarMobile ? ' sidebar-collapsed' : ''}`}>
	        {!isSidebarMobile ? <Sidebar
	          activePage={activePage}
	          onNavigate={handleNavigate}
	          currentUser={currentUser}
	          onLogout={handleLogout}
	          isCollapsed={isSidebarCollapsed}
	          isMobile={isSidebarMobile}
	          isOpen={isSidebarMobile ? isSidebarOpen : true}
	          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
	          onClose={() => setIsSidebarOpen(false)}
            onReplayTutorial={() => setShowTutorial(true)}
            language={language}
            onLanguageChange={setLanguage}
	        /> : null}

        <main className="content-area">
          <TokenBalance onOpenCredits={() => handleNavigate('top-up-credits')} language={language} />
          <div key={activePage} className="page-transition">
            {activePage === 'create' ? (
              <CreateHubPage onNavigate={handleNavigate} />
            ) : activePage === 'personalize' || activePage === 'create-persona' || activePage === 'content-pillar' ? (
              <PersonalizePage
                personaConfig={personaConfig}
                language={language}
                onPersonaSaved={handlePersonalizePersonaSaved}
                initialTab={activePage === 'content-pillar' ? 'content-pillar' : activePage === 'personalize' ? undefined : 'persona'}
                onNavigate={handleNavigate}
              />
            ) : activePage === 'generate-topic' ? (
              <GenerateTopicPage
                userId={currentUser?.id || ''}
                language={language}
                onContinueToContent={() => handleNavigate('content-engine')}
                onUpgrade={() => handleNavigate('subscription-plans')}
              />
            ) : activePage === 'content-engine' ? (
              <ContentEnginePage
                userId={currentUser?.id || ''}
                outputsRefreshKey={contentOutputsRefreshKey}
                onScheduledJobCreated={handleScheduledJobCreated}
                generationCompletion={generationCompletion}
                onGenerationCompletionHandled={handleGenerationCompletionHandled}
                onOpenSchedule={() => handleNavigate('auto-post')}
                onConnectThreads={() => handleNavigate('connecting-apps')}
                onViewContentBank={() => handleNavigate('content-bank')}
              />
            ) : activePage === 'content-bank' ? (
              <ContentBankPage userId={currentUser?.id || ''} onNavigate={handleNavigate} language={language} />
            ) : activePage === 'manual-post' ? (
              <ManualPostPage
                userId={currentUser?.id || ''}
                onBackToContentEngine={() => setActivePage('content-engine')}
              />
            ) : activePage === 'auto-post' ? (
              <AutoPostPage
                userId={currentUser?.id || ''}
                threadsStatus={threadsStatus}
                onConnectThreads={() => handleNavigate('connecting-apps')}
                onReviewContent={() => handleNavigate('content-bank')}
                language={language}
              />
            ) : activePage === 'subscription-plans' ? (
              <SubscriptionPlansPage userId={currentUser?.id || ''} onOpenPayments={() => handleNavigate('payments')} language={language} />
            ) : activePage === 'ai-credits' ? (
              <AiCreditsPage onTopUp={() => handleNavigate('top-up-credits')} onViewPlans={() => handleNavigate('subscription-plans')} onViewPaymentHistory={() => handleNavigate('payments')} language={language} />
            ) : activePage === 'payments' ? (
              <PaymentsPage onBackToCredits={() => handleNavigate('ai-credits')} onTopUp={() => handleNavigate('top-up-credits')} />
            ) : activePage === 'top-up-credits' ? (
              <TopUpCreditsPage onBackToCredits={() => handleNavigate('ai-credits')} onPaymentComplete={() => handleNavigate('ai-credits')} onOpenPayments={() => handleNavigate('payments')} language={language} />
            ) : activePage === 'connecting-apps' ? (
              <ConnectingAppsPage onStatusChange={(status) => {
                setThreadsStatus(status)
              }} />
            ) : activePage === 'settings' ? (
              <SettingsPage user={currentUser} language={language} onLanguageChange={setLanguage} theme={theme} onThemeChange={setTheme} onReplayTutorial={() => setShowTutorial(true)} onLogout={handleLogout} onNavigate={handleNavigate} />
            ) : activePage === 'referral' ? (
              <ReferralPage language={language} />
              ) : (
                <DashboardPage activePage={activePage} userId={currentUser?.id || ''} onNavigate={handleNavigate} threadsStatus={threadsStatus} />
              )}
          </div>
        </main>
        {generationProgress ? (
          <ContentGenerationProgress progress={generationProgress} />
        ) : null}
        {isSidebarMobile ? (
          <MobileNavigation
            activePage={activePage}
            isMoreOpen={isMoreOpen}
            onNavigate={handleNavigate}
            onToggleMore={() => setIsMoreOpen((current) => !current)}
            onCloseMore={() => setIsMoreOpen(false)}
            currentUser={currentUser}
            language={language}
          />
        ) : null}
      </div>
    )
  }

  return (
    <ToastProvider language={language}>
      {content}
      {showTutorial && authStatus === 'authenticated' && !showAdminEntryChoice && personaStatus === 'ready' ? <OnboardingTutorial onComplete={completeTutorial} /> : null}
      {upgradePrompt ? (
        <div className="content-bank-dialog-backdrop" role="presentation" onMouseDown={() => setUpgradePrompt('')}>
          <section className="content-bank-dialog idea-upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="upgrade-plan-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">Upgrade paket</p>
                <h2 id="upgrade-plan-title">Buka fitur ini di alurin</h2>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setUpgradePrompt('')}>×</button>
            </header>
            <div className="idea-upgrade-body">
              <div className="idea-upgrade-icon"><AppIcon name="sparkles" /></div>
              <p>{upgradePrompt}</p>
              <div className="idea-upgrade-actions">
                <button className="ghost-button" type="button" onClick={() => setUpgradePrompt('')}>Nanti</button>
                <button className="primary-button" type="button" onClick={() => { setUpgradePrompt(''); handleNavigate('subscription-plans') }}>Upgrade Plan</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </ToastProvider>
  )
}

function App() {
  if (window.location.pathname === '/privacy-policy') {
    return <LegalPage document="privacy" />
  }

  if (window.location.pathname === '/terms-of-service') {
    return <LegalPage document="terms" />
  }

  if (isRootEmailConfirmationCallback()) {
    return <EmailConfirmedPage />
  }

  if (
    window.location.pathname === '/' &&
    isThreadsCallbackSearch(window.location.search)
  ) {
    return <ThreadsCallbackPage />
  }

  if (window.location.pathname === '/') {
    return <LandingPage />
  }

  // Public content demo is temporarily disabled.
  // if (window.location.pathname === '/demo') {
  //   return (
  //     <ToastProvider>
  //       <CreateContentDemoPage
  //         isAuthenticated={false}
  //         onRequestAuth={(mode) => {
  //           window.location.href = mode === 'login' ? '/login' : '/register'
  //         }}
  //       />
  //     </ToastProvider>
  //   )
  // }

  if (window.location.pathname === '/check-email') {
    return <CheckEmailPage email={getStoredPendingVerificationEmail()} />
  }

  if (window.location.pathname === '/email-confirmed') {
    return <EmailConfirmedPage />
  }

  if (window.location.pathname === '/forgot-password') {
    return <ForgotPasswordPage />
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPasswordPage />
  }

  if (window.location.pathname === '/threads/callback') {
    return <ThreadsCallbackPage />
  }

  return <AppShell />
}

export default App
