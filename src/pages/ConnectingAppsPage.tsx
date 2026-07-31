import { useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import {
  getCurrentAuthState,
  type ThreadsSocialAccountState,
} from '../services/authService'
import {
  deleteThreadsConnection,
  getThreadsAuthorizationUrl,
} from '../services/threadsAuth'

type ThreadsConnectionView = {
  connected: boolean
  needsReconnect: boolean
  username?: string
  accountId?: string
  threadsId?: string
  expiresAt?: string
  updatedAt?: string
}

type AppConnection = {
  name: string
  handle: string
  connected: boolean
  provider: 'threads' | 'instagram' | 'tiktok' | 'facebook' | 'youtube'
}

const appConnections: AppConnection[] = [
  {
    name: 'Threads',
    handle: 'Belum terhubung',
    connected: false,
    provider: 'threads',
  },
]

function toThreadsConnectionView(
  threads: ThreadsSocialAccountState | null,
): ThreadsConnectionView | null {
  if (!threads) {
    return null
  }

  return {
    connected: Boolean(threads.connected),
    needsReconnect: Boolean(threads.needsReconnect),
    username: threads.username || threads.accountId,
    accountId: threads.accountId,
    threadsId: threads.threadsId,
    expiresAt: threads.expiresAt,
    updatedAt: threads.updatedAt,
  }
}

export function ConnectingAppsPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [isConnectingThreads, setIsConnectingThreads] = useState(false)
  const [isDeletingThreads, setIsDeletingThreads] = useState(false)
  const [isLoadingThreadsStatus, setIsLoadingThreadsStatus] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [threadsConnection, setThreadsConnection] = useState<ThreadsConnectionView | null>(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (!connected && !error) {
      return
    }

    if (connected === 'true') {
      toastSuccess(
        'Threads connected',
        'Akun Threads berhasil terhubung dan status koneksi sudah diperbarui.',
      )
    }

    if (error) {
      const message = error.trim() || 'Terjadi error saat menyelesaikan koneksi Threads.'
      setConnectionError(message)
      toastError('Threads connection failed', message)
    }

    window.history.replaceState({}, document.title, window.location.pathname)
  }, [toastError, toastSuccess])

  useEffect(() => {
    let cancelled = false

    async function refreshThreadsStatus() {
      try {
        if (cancelled) {
          return
        }

        setIsLoadingThreadsStatus(true)

        const authState = await getCurrentAuthState()
        const nextThreads = toThreadsConnectionView(authState?.socialAccounts?.threads ?? null)

        if (cancelled) {
          return
        }

        setThreadsConnection(nextThreads)
        setConnectionError('')
      } catch (error) {
        if (cancelled) {
          return
        }

        setConnectionError(
          error instanceof Error
            ? error.message
            : 'Gagal memuat status koneksi Threads.',
        )
      } finally {
        if (!cancelled) {
          setIsLoadingThreadsStatus(false)
        }
      }
    }

    void refreshThreadsStatus()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleThreadsConnect() {
    try {
      setConnectionError('')
      setIsConnectingThreads(true)

      const authorizationUrl = await getThreadsAuthorizationUrl()
      window.location.assign(authorizationUrl)
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : 'Terjadi error saat memulai koneksi Threads.',
      )
      setIsConnectingThreads(false)
    }
  }

  async function handleThreadsDelete() {
    try {
      setConnectionError('')
      setIsDeletingThreads(true)

      await deleteThreadsConnection()
      setThreadsConnection(null)
      toastSuccess('Threads unlinked', 'Koneksi akun Threads berhasil dihapus.')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Terjadi error saat menghapus koneksi Threads.'

      setConnectionError(message)
      toastError('Threads unlink failed', message)
    } finally {
      setIsDeletingThreads(false)
    }
  }

  return (
    <section className="connecting-page">
      <header className="page-header">
        <p className="eyebrow">Reframe Account</p>
        <h1>Reframe Connections</h1>
        <p className="page-description">
          Hubungkan akun media sosial Anda untuk memulai automasi.
        </p>
      </header>

      {connectionError ? (
        <div className="integration-note integration-note-error">
          <AppIcon name="info" />
          <p>{connectionError}</p>
        </div>
      ) : null}

      <div className="integration-list">
        {appConnections.map((app) => {
          const isThreads = app.provider === 'threads'
          const canUseThreads = Boolean(
            threadsConnection?.connected && !threadsConnection?.needsReconnect,
          )
          const needsReconnect = Boolean(
            threadsConnection?.connected && threadsConnection?.needsReconnect,
          )
          const isConnected = canUseThreads
          const handle = isThreads
            ? isConnected
              ? `Terhubung${threadsConnection?.username ? ` sebagai ${threadsConnection.username}` : ''}`
              : needsReconnect
                ? 'Perlu reconnect'
                : isLoadingThreadsStatus
                  ? 'Memeriksa status koneksi...'
                  : 'Belum terhubung'
            : app.handle

          return (
            <article className="integration-card" key={app.name}>
              <div className="integration-left">
                <div className="integration-icon">
                  <AppIcon name="link" />
                </div>

                <div className="integration-copy">
                  <strong>{app.name}</strong>
                  <p>{handle}</p>
                </div>
              </div>

              {isConnected ? (
                <div className="integration-status">
                  <span className="status-inline success">
                    <AppIcon name="check" />
                    Terhubung
                  </span>
                  <button
                    className="ghost-button integration-unlink-button"
                    type="button"
                    onClick={handleThreadsDelete}
                    disabled={isDeletingThreads || isConnectingThreads || isLoadingThreadsStatus}
                  >
                    <AppIcon name="link" />
                    {isDeletingThreads ? 'Menghapus...' : 'Unlink'}
                  </button>
                </div>
              ) : needsReconnect ? (
                <div className="integration-status">
                  <button
                    className="connect-button"
                    type="button"
                    onClick={handleThreadsConnect}
                    disabled={isConnectingThreads || isLoadingThreadsStatus}
                  >
                    <AppIcon name={isConnectingThreads ? 'link' : 'plus'} />
                    {isConnectingThreads ? 'Menghubungkan...' : 'Reconnect Threads'}
                  </button>
                  <button
                    className="ghost-button integration-unlink-button"
                    type="button"
                    onClick={handleThreadsDelete}
                    disabled={isDeletingThreads || isConnectingThreads || isLoadingThreadsStatus}
                  >
                    <AppIcon name="link" />
                    {isDeletingThreads ? 'Menghapus...' : 'Unlink'}
                  </button>
                </div>
              ) : isThreads ? (
                <button
                  className="connect-button"
                  type="button"
                  onClick={handleThreadsConnect}
                  disabled={isConnectingThreads || isLoadingThreadsStatus}
                >
                  <AppIcon name={isConnectingThreads ? 'link' : 'plus'} />
                  {isConnectingThreads ? 'Menghubungkan...' : 'Hubungkan Threads'}
                </button>
              ) : (
                <button className="connect-button" type="button">
                  <AppIcon name="plus" />
                  Hubungkan
                </button>
              )}
            </article>
          )
        })}
      </div>

      {/* <div className="integration-note">
        <AppIcon name="info" />
        <p>
          Flow Threads: FE memanggil backend connect dengan Bearer token login app,
          backend mengembalikan `authorizationUrl`, lalu user diarahkan ke Threads
          untuk login dan approval. Setelah callback kembali, status final diambil
          lagi dari `GET /api/auth/me`.
        </p>
      </div> */}
    </section>
  )
}
