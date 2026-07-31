import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { Sidebar } from './components/Sidebar'
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

function AppShell() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [authError, setAuthError] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [activePage, setActivePage] = useState<NavKey>(getStoredActivePage)
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus>('idle')
  const [personaConfig, setPersonaConfig] = useState<PersonaConfigRecord | null>(null)
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hasThreadsCallbackState =
      searchParams.has('connected') || searchParams.has('error')

    if (hasThreadsCallbackState) {
      setActivePage('connecting-apps')
    }
  }, [])

  const handleAuthenticated = useCallback(async (session: AuthSession) => {
    setCurrentUser(session.user)
    setAuthStatus('authenticated')
    setActivePage('dashboard')
    await loadPersonaConfig(session.user.id)
  }, [loadPersonaConfig])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      clearAuthSession()
    } finally {
      resetWorkspaceState()
      setAuthStatus('unauthenticated')
    }
  }, [])

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
      <AuthPage
        onAuthenticated={(session) => void handleAuthenticated(session)}
        initialMode="register"
        allowRegister
      />
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
              <ContentEnginePage userId={currentUser?.id || ''} />
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
                <DashboardPage activePage={activePage} userId={currentUser?.id || ''} />
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
