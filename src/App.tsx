import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { Sidebar } from './components/Sidebar'
import { CreateContentDemoPage } from './pages/CreateContentDemoPage'
import { ManualPostPage } from './pages/ManualPostPage'
import { DashboardPage } from './pages/DashboardPage'
import { AutoPostPage } from './pages/AutoPostPage'
import { SubscriptionPlansPage } from './pages/SubscriptionPlansPage'
import { ConnectingAppsPage } from './pages/ConnectingAppsPage'
import { ThreadsCallbackPage } from './pages/ThreadsCallbackPage'
import { ContentEnginePage } from './pages/ContentEnginePage'
import { GenerateTopicPage } from './pages/GenerateTopicPage'
import { PersonalizePage } from './pages/PersonalizePage'
import type { NavKey } from './types/navigation'
import { ToastProvider } from './components/Toast'
import {
  clearAuthSession,
  getCurrentUser,
  logout,
  type AuthUser,
  type AuthSession,
} from './services/authService'
import {
  findPersonaConfigForUser,
  type PersonaConfigRecord,
} from './services/personaConfigs'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error'
type PersonaStatus = 'idle' | 'loading' | 'ready' | 'error'
type StandaloneAuthMode = 'login' | 'register'
const DEMO_SESSION_STORAGE_KEY = 'reframe.demoSessionUserId'
const ACTIVE_PAGE_STORAGE_KEY = 'reframe.activePage'

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

function getStoredDemoSessionUserId() {
  if (typeof localStorage === 'undefined') {
    return undefined
  }

  const value = localStorage.getItem(DEMO_SESSION_STORAGE_KEY)

  return value && value.trim() ? value : undefined
}

function setStoredDemoSessionUserId(userId?: string) {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (userId) {
    localStorage.setItem(DEMO_SESSION_STORAGE_KEY, userId)
  } else {
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
  }
}

function AppShell() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [authError, setAuthError] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [activePage, setActivePage] = useState<NavKey>(getStoredActivePage)
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus>('idle')
  const [personaConfig, setPersonaConfig] = useState<PersonaConfigRecord | null>(null)
  const [demoModeActive, setDemoModeActive] = useState(false)
  const [demoAccessGranted, setDemoAccessGranted] = useState(false)
  const [showStandaloneAuth, setShowStandaloneAuth] = useState(false)
  const [standaloneAuthMode, setStandaloneAuthMode] = useState<StandaloneAuthMode>('register')
  const [authCancelSignal, setAuthCancelSignal] = useState(0)
  const bootstrapRunIdRef = useRef(0)

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
    } catch {
      if (activeRunId !== bootstrapRunIdRef.current) {
        return
      }

      setPersonaConfig(null)
      setPersonaStatus('error')
    }
  }, [])

  function resetWorkspaceState() {
    setCurrentUser(null)
    setPersonaConfig(null)
    setActivePage('dashboard')
    setPersonaStatus('idle')
    setDemoModeActive(false)
    setDemoAccessGranted(false)
    setShowStandaloneAuth(false)
    setStandaloneAuthMode('register')
    setAuthCancelSignal(0)
  }

  const hydrateAuthState = useCallback(async () => {
    const runId = ++bootstrapRunIdRef.current
    setAuthStatus('loading')
    setAuthError('')

    try {
      const user = await getCurrentUser()

      if (runId !== bootstrapRunIdRef.current) {
        return
      }

      if (!user) {
        clearAuthSession()
        resetWorkspaceState()
        setAuthStatus('unauthenticated')
        return
      }

      setCurrentUser(user)
      setAuthStatus('authenticated')
      setShowStandaloneAuth(false)

      const pendingDemoUserId = getStoredDemoSessionUserId()
      const shouldResumeDemoSession = pendingDemoUserId === user.id

      setDemoAccessGranted(false)

      if (shouldResumeDemoSession) {
        setDemoModeActive(true)
      } else {
        setDemoModeActive(false)
      }

      void loadPersonaConfig(user.id, runId)
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
    void hydrateAuthState()
  }, [hydrateAuthState])

  useEffect(() => {
    setStoredActivePage(activePage)
  }, [activePage])

  const handleStandaloneAuthenticated = useCallback(async (
    session: AuthSession,
    authMode: StandaloneAuthMode,
  ) => {
    setCurrentUser(session.user)
    setAuthStatus('authenticated')
    setShowStandaloneAuth(false)
    setActivePage('dashboard')
    setDemoAccessGranted(false)
    setStandaloneAuthMode(authMode)

    if (authMode === 'register') {
      setStoredDemoSessionUserId(session.user.id)
      setDemoModeActive(true)
    } else {
      setStoredDemoSessionUserId(undefined)
      setDemoModeActive(false)
    }

    await loadPersonaConfig(session.user.id)
  }, [loadPersonaConfig])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      clearAuthSession()
    } finally {
      setStoredDemoSessionUserId(undefined)
      resetWorkspaceState()
      setAuthStatus('unauthenticated')
    }
  }, [])

  const continueToDashboardFromDemo = useCallback(async () => {
    setStoredDemoSessionUserId(undefined)
    setDemoModeActive(false)
    setDemoAccessGranted(false)
    setShowStandaloneAuth(false)
    setAuthCancelSignal((current) => current + 1)
    await hydrateAuthState()
  }, [hydrateAuthState])

  function handlePersonalizePersonaSaved(nextConfig: PersonaConfigRecord) {
    setPersonaConfig(nextConfig)
    setActivePage('personalize')
  }

  let content: ReactNode

  if (authStatus === 'loading') {
    content = (
      <div className="bootstrap-shell">
        <section className="panel bootstrap-card">
          <p className="eyebrow">Bootstrapping</p>
          <h1>Memeriksa session login...</h1>
          <p className="page-description">
            Kami sedang cek apakah user sudah login. Setelah itu baru kita lanjut ke
            persona config.
          </p>
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
    content = (
      <>
        <main className="content-area setup-mode setup-immersive">
          <CreateContentDemoPage
            isAuthenticated={false}
            onRequestAuth={(mode) => {
              setStandaloneAuthMode(mode)
              setShowStandaloneAuth(true)
            }}
            onDemoSessionStart={() => setDemoModeActive(true)}
            authCancelSignal={authCancelSignal}
            onDemoSessionEnd={() => {
              void continueToDashboardFromDemo()
            }}
          />
        </main>

        {showStandaloneAuth ? (
          <div className="auth-overlay">
            <AuthPage
              onAuthenticated={handleStandaloneAuthenticated}
              initialMode={standaloneAuthMode}
              allowRegister
              onBack={() => {
                setShowStandaloneAuth(false)
                setDemoModeActive(false)
                setAuthCancelSignal((current) => current + 1)
              }}
            />
          </div>
        ) : null}
      </>
    )
  } else if (demoModeActive) {
    content = (
      <>
        <main className="content-area setup-mode setup-immersive">
          <CreateContentDemoPage
            isAuthenticated
            onRequestAuth={(mode) => {
              setStandaloneAuthMode(mode)
              setShowStandaloneAuth(true)
            }}
            onDemoSessionStart={() => setDemoModeActive(true)}
            authCancelSignal={authCancelSignal}
            onDemoSessionEnd={() => {
              void continueToDashboardFromDemo()
            }}
          />
        </main>

        {showStandaloneAuth ? (
          <div className="auth-overlay">
            <AuthPage
              onAuthenticated={handleStandaloneAuthenticated}
              initialMode={standaloneAuthMode}
              allowRegister
              onBack={() => {
                setShowStandaloneAuth(false)
                setDemoModeActive(true)
                setAuthCancelSignal((current) => current + 1)
              }}
            />
          </div>
        ) : null}
      </>
    )
  } else if (personaStatus === 'loading' || personaStatus === 'idle') {
    content = (
      <div className="bootstrap-shell">
        <section className="panel bootstrap-card">
          <p className="eyebrow">Bootstrapping</p>
          <h1>Memuat persona config...</h1>
          <p className="page-description">
            Session login sudah valid. Sekarang kami cek persona config milik user
            aktif sebelum masuk dashboard.
          </p>
        </section>
      </div>
    )
  } else if (personaStatus === 'error') {
    content = (
      <div className="bootstrap-shell">
        <section className="panel bootstrap-card">
          <p className="eyebrow">Bootstrapping</p>
          <h1>Memuat dashboard...</h1>
          <p className="page-description">
            Persona config belum terbaca, jadi kami lanjutkan ke dashboard dulu.
          </p>
          <button className="primary-button" type="button" onClick={() => void hydrateAuthState()}>
            Coba lagi
          </button>
        </section>
      </div>
    )
  } else if (!personaConfig && !demoModeActive && !demoAccessGranted) {
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
      <div className="dashboard-shell">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="content-area">
          <div key={activePage} className="page-transition">
            {activePage === 'personalize' || activePage === 'create-persona' || activePage === 'content-pillar' ? (
              <PersonalizePage
                personaConfig={personaConfig}
                onPersonaSaved={handlePersonalizePersonaSaved}
              />
            ) : activePage === 'generate-topic' ? (
              <GenerateTopicPage userId={currentUser?.id || ''} />
            ) : activePage === 'content-engine' ? (
              <ContentEnginePage
                userId={currentUser?.id || ''}
                onOpenManualPost={() => setActivePage('manual-post')}
              />
            ) : activePage === 'manual-post' ? (
              <ManualPostPage
                userId={currentUser?.id || ''}
                onBackToContentEngine={() => setActivePage('content-engine')}
              />
            ) : activePage === 'auto-post' ? (
              <AutoPostPage userId={currentUser?.id || ''} />
            ) : activePage === 'subscription-plans' ? (
              <SubscriptionPlansPage userId={currentUser?.id || ''} />
            ) : activePage === 'connecting-apps' ? (
              <ConnectingAppsPage />
            ) : (
              <DashboardPage activePage={activePage} />
            )}
          </div>
        </main>
      </div>
    )
  }

  return <ToastProvider>{content}</ToastProvider>
}

function App() {
  if (window.location.pathname === '/threads/callback') {
    return <ThreadsCallbackPage />
  }

  return <AppShell />
}

export default App
