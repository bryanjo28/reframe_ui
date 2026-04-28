import { useCallback, useEffect, useState, type ReactNode } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { Sidebar } from './components/Sidebar'
import { CreateContentPillarPage } from './pages/CreateContentPillarPage'
import { CreatePersonaPage } from './pages/CreatePersonaPage'
import { AutoPostPage } from './pages/AutoPostPage'
import { DashboardPage } from './pages/DashboardPage'
import { ConnectingAppsPage } from './pages/ConnectingAppsPage'
import { GenerateContentPage } from './pages/GenerateContentPage'
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

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [authError, setAuthError] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [activePage, setActivePage] = useState<NavKey>('dashboard')
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus>('idle')
  const [personaError, setPersonaError] = useState('')
  const [personaConfig, setPersonaConfig] = useState<PersonaConfigRecord | null>(null)

  function resetWorkspaceState() {
    setCurrentUser(null)
    setPersonaConfig(null)
    setActivePage('dashboard')
    setPersonaStatus('idle')
    setPersonaError('')
  }

  const loadPersonaConfig = useCallback(async (userId: string) => {
    setPersonaStatus('loading')
    setPersonaError('')

    try {
      const config = await findPersonaConfigForUser(userId)
      setPersonaConfig(config)
      setActivePage(config ? 'dashboard' : 'create-persona')
      setPersonaStatus('ready')
    } catch (error) {
      setPersonaConfig(null)
      setPersonaError(error instanceof Error ? error.message : 'Gagal memuat persona config.')
      setPersonaStatus('error')
    }
  }, [])

  const hydrateAuthState = useCallback(async () => {
    setAuthStatus('loading')
    setAuthError('')

    try {
      const user = await getCurrentUser()

      if (!user) {
        clearAuthSession()
        resetWorkspaceState()
        setAuthStatus('unauthenticated')
        return
      }

      setCurrentUser(user)
      setAuthStatus('authenticated')
      await loadPersonaConfig(user.id)
    } catch (error) {
      clearAuthSession()
      resetWorkspaceState()
      setAuthError(error instanceof Error ? error.message : 'Gagal memuat session auth.')
      setAuthStatus('error')
    }
  }, [loadPersonaConfig])

  useEffect(() => {
    void hydrateAuthState()
  }, [hydrateAuthState])

  const handleAuthenticated = useCallback(
    async (session: AuthSession) => {
      setCurrentUser(session.user)
      setAuthStatus('authenticated')
      setPersonaStatus('idle')
      setPersonaError('')
      await loadPersonaConfig(session.user.id)
    },
    [loadPersonaConfig],
  )

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

  function handlePersonaSaved(nextConfig: PersonaConfigRecord) {
    setPersonaConfig(nextConfig)
    setActivePage('dashboard')
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
    content = <AuthPage onAuthenticated={handleAuthenticated} />
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
          <h1>Gagal memuat persona config</h1>
          <p className="page-description">{personaError}</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => void loadPersonaConfig(currentUser?.id || '')}
            disabled={!currentUser?.id}
          >
            Coba lagi
          </button>
        </section>
      </div>
    )
  } else if (!personaConfig) {
    content = (
      <div className="dashboard-shell">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="content-area setup-mode">
          <div key={activePage} className="page-transition">
            <CreatePersonaPage
              personaConfig={null}
              isInitialSetup
              onSaved={handlePersonaSaved}
            />
          </div>
        </main>
      </div>
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
            {activePage === 'create-persona' ? (
              <CreatePersonaPage personaConfig={personaConfig} onSaved={handlePersonaSaved} />
            ) : activePage === 'content-pillar' ? (
              <CreateContentPillarPage />
            ) : activePage === 'generate-topic' ? (
              <GenerateContentPage userId={currentUser?.id || ''} />
            ) : activePage === 'auto-post' ? (
              <AutoPostPage userId={currentUser?.id || ''} />
            ) : activePage === 'connecting-apps' ? (
              <ConnectingAppsPage userId={currentUser?.id || ''} />
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

export default App
