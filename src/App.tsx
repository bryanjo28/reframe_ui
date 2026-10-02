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
import { GenerateTopicPage } from './pages/GenerateTopicPage'
import { PersonalizePage } from './pages/PersonalizePage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { EmailConfirmedPage } from './pages/EmailConfirmedPage'
import { CreateContentDemoPage } from './pages/CreateContentDemoPage'
import type { AppTheme, NavKey } from './types/navigation'
import { ToastProvider } from './components/Toast'
import { ContentGenerationProgress } from './components/ContentGenerationProgress'
import {
  clearAuthSession,
  getCurrentAuthState,
  logout,
  type AuthUser,
} from './services/authService'
import {
  findPersonaConfigForUser,
  type PersonaConfigRecord,
} from './services/personaConfigs'
import {
  getScheduledJobById,
  isScheduledJobProgressTerminal,
  type ScheduledJobProgress,
} from './services/threadsAutoPost'
import { notifyUsageChanged } from './services/usage'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error'
type PersonaStatus = 'idle' | 'loading' | 'ready'
type UnauthenticatedView = 'login' | 'check-email'
const ACTIVE_PAGE_STORAGE_KEY = 'reframe.activePage'
const PENDING_VERIFICATION_EMAIL_STORAGE_KEY = 'reframe.pendingVerificationEmail'
const APP_THEME_STORAGE_KEY = 'reframe.appTheme'

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
  if (typeof localStorage === 'undefined') {
    return 'dashboard'
  }

  const value = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY)

  if (
    value === 'dashboard' ||
    value === 'personalize' ||
    value === 'create-persona-chat' ||
    value === 'create-persona' ||
    value === 'content-pillar' ||
    value === 'generate-topic' ||
    value === 'content-engine' ||
    value === 'manual-post' ||
    value === 'auto-post' ||
    value === 'subscription-plans' ||
    value === 'connecting-apps'
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
  const [authError, setAuthError] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isThreadsConnected, setIsThreadsConnected] = useState(false)
  const [unauthenticatedView, setUnauthenticatedView] = useState<UnauthenticatedView>('login')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(getStoredPendingVerificationEmail)
  const [authHelperMessage, setAuthHelperMessage] = useState('')
  const [activePage, setActivePage] = useState<NavKey>(getStoredActivePage)
  const [isSidebarMobile, setIsSidebarMobile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme)
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus>('idle')
  const [personaConfig, setPersonaConfig] = useState<PersonaConfigRecord | null>(null)
  const [activeGenerationJobId, setActiveGenerationJobId] = useState('')
  const [generationProgress, setGenerationProgress] = useState<ScheduledJobProgress | null>(null)
  const [contentOutputsRefreshKey, setContentOutputsRefreshKey] = useState(0)
  const bootstrapRunIdRef = useRef(0)

  useEffect(() => {
    if (!activeGenerationJobId) {
      return
    }

    let isCancelled = false
    let pollTimeoutId: number | undefined
    let dismissTimeoutId: number | undefined

    async function pollJob() {
      try {
        const job = await getScheduledJobById(activeGenerationJobId)

        if (isCancelled) {
          return
        }

        if (job.progress) {
          setGenerationProgress(job.progress)

          if (isScheduledJobProgressTerminal(job.progress)) {
            setContentOutputsRefreshKey((current) => current + 1)
            notifyUsageChanged()
            dismissTimeoutId = window.setTimeout(() => {
              setActiveGenerationJobId('')
              setGenerationProgress(null)
            }, 2400)
            return
          }
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
      window.clearTimeout(dismissTimeoutId)
    }
  }, [activeGenerationJobId])

  const handleScheduledJobCreated = useCallback((jobId: string, targetCount: number) => {
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
    setCurrentUser(null)
    setIsThreadsConnected(false)
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
      setIsThreadsConnected(Boolean(
        socialAccounts?.threads?.connected && !socialAccounts.threads.needsReconnect,
      ))
      setStoredPendingVerificationEmail(undefined)
      setPendingVerificationEmail('')
      setAuthHelperMessage('')
      setAuthStatus('authenticated')

      if (onboarding?.hasPersona === false) {
        setPersonaConfig(null)
        setPersonaStatus('ready')
        replaceAppPath('/first-setup')
        return
      }

      const config = await loadPersonaConfig(user.id, runId)

      if (runId === bootstrapRunIdRef.current) {
        if (!config) {
          replaceAppPath('/first-setup')
        } else if (window.location.pathname !== '/connecting-apps') {
          replaceAppPath('/dashboard')
        }
      }
    } catch (error) {
      if (runId !== bootstrapRunIdRef.current) {
        return
      }

      clearAuthSession()
      resetWorkspaceState()
      setAuthError(error instanceof Error ? error.message : 'Gagal memuat session auth.')
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

      if (!authState || runId !== bootstrapRunIdRef.current) {
        throw new Error('Session login tidak tersedia.')
      }

      setCurrentUser(authState.user)
      setIsThreadsConnected(Boolean(
        authState.socialAccounts?.threads?.connected &&
          !authState.socialAccounts.threads.needsReconnect,
      ))
      setAuthStatus('authenticated')
      setUnauthenticatedView('login')
      setStoredPendingVerificationEmail(undefined)
      setPendingVerificationEmail('')
      setAuthHelperMessage('')
      setActivePage('dashboard')

      if (authState.onboarding?.hasPersona === false) {
        setPersonaConfig(null)
        setPersonaStatus('ready')
        replaceAppPath('/first-setup')
        return
      }

      const config = await loadPersonaConfig(authState.user.id, runId)

      if (runId === bootstrapRunIdRef.current) {
        replaceAppPath(config ? '/dashboard' : '/first-setup')
      }
    } catch (error) {
      clearAuthSession()
      resetWorkspaceState()
      setAuthError(error instanceof Error ? error.message : 'Gagal memuat session login.')
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
      setAuthHelperMessage('')
      setAuthStatus('unauthenticated')
      replaceAppPath('/login')
    }
  }, [])

  function handlePersonalizePersonaSaved(nextConfig: PersonaConfigRecord) {
    setPersonaConfig(nextConfig)
    setActivePage('dashboard')
    replaceAppPath('/dashboard')
  }

  const handleNavigate = useCallback((page: NavKey) => {
    setActivePage(page)

    if (isSidebarMobile) {
      setIsSidebarOpen(false)
    }
  }, [isSidebarMobile])

  let content: ReactNode

  if (authStatus === 'loading') {
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
  } else if (personaStatus === 'loading' || personaStatus === 'idle') {
    content = (
      <div className="bootstrap-shell">
        <section className="bootstrap-loading" aria-live="polite">
          <h1>Memuat dashboard...</h1>
        </section>
      </div>
    )
  } else if (!personaConfig) {
    content = (
      <main className="content-area setup-mode setup-immersive">
        <div className="page-transition">
          <PersonalizePage
            personaConfig={personaConfig}
            onPersonaSaved={handlePersonalizePersonaSaved}
          />
        </div>
      </main>
    )
  } else {
    content = (
      <div className={`dashboard-shell${isSidebarCollapsed && !isSidebarMobile ? ' sidebar-collapsed' : ''}`}>
        {isSidebarMobile ? (
          <button
            className="mobile-sidebar-trigger"
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Buka sidebar"
            aria-expanded={isSidebarOpen}
          >
            <AppIcon name="menu" />
            <span>Menu</span>
          </button>
        ) : null}

        {isSidebarMobile && isSidebarOpen ? (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Tutup sidebar"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

	        <Sidebar
	          activePage={activePage}
	          onNavigate={handleNavigate}
	          currentUser={currentUser}
	          onLogout={handleLogout}
	          isCollapsed={isSidebarCollapsed}
	          isMobile={isSidebarMobile}
	          isOpen={isSidebarMobile ? isSidebarOpen : true}
            theme={theme}
            onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
	          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
	          onClose={() => setIsSidebarOpen(false)}
	          isThreadsConnected={isThreadsConnected}
	        />

        <main className="content-area">
          <div key={activePage} className="page-transition">
            {activePage === 'personalize' || activePage === 'create-persona' || activePage === 'content-pillar' ? (
              <PersonalizePage
                personaConfig={personaConfig}
                onPersonaSaved={handlePersonalizePersonaSaved}
                initialTab={activePage === 'content-pillar' ? 'content-pillar' : 'persona'}
              />
            ) : activePage === 'generate-topic' ? (
              <GenerateTopicPage userId={currentUser?.id || ''} />
            ) : activePage === 'content-engine' ? (
              <ContentEnginePage
                userId={currentUser?.id || ''}
                outputsRefreshKey={contentOutputsRefreshKey}
                onScheduledJobCreated={handleScheduledJobCreated}
              />
            ) : activePage === 'manual-post' ? (
              <ManualPostPage
                userId={currentUser?.id || ''}
                onBackToContentEngine={() => setActivePage('content-engine')}
              />
            ) : activePage === 'auto-post' ? (
              <AutoPostPage
                userId={currentUser?.id || ''}
                isThreadsConnected={isThreadsConnected}
              />
            ) : activePage === 'subscription-plans' ? (
              <SubscriptionPlansPage userId={currentUser?.id || ''} />
            ) : activePage === 'connecting-apps' ? (
              <ConnectingAppsPage />
              ) : (
                <DashboardPage activePage={activePage} userId={currentUser?.id || ''} />
              )}
          </div>
        </main>
        {generationProgress ? (
          <ContentGenerationProgress progress={generationProgress} />
        ) : null}
      </div>
    )
  }

  return <ToastProvider>{content}</ToastProvider>
}

function App() {
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
    return (
      <ToastProvider>
        <CreateContentDemoPage
          isAuthenticated={false}
          onRequestAuth={(mode) => {
            window.location.href = mode === 'login' ? '/login' : '/register'
          }}
        />
      </ToastProvider>
    )
  }

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
