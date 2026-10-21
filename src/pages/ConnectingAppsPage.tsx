import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { dismissModal } from '../utils/modalAnimation'
import { useToast } from '../components/useToast'
import {
  getCurrentAuthState,
  getThreadsConnectionStatus,
  invalidateAuthStateCache,
  type ThreadsConnectionStatus,
  type ThreadsSocialAccountState,
} from '../services/authService'
import {
  deleteThreadsConnection,
  getThreadsAuthorizationUrl,
} from '../services/threadsAuth'
import { translateText, type UiLanguage } from '../utils/uiLanguage'

type ThreadsConnectionView = {
  status?: string
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
    status: typeof threads.status === 'string' ? threads.status : undefined,
    connected: Boolean(threads.connected),
    needsReconnect: Boolean(threads.needsReconnect),
    username: threads.username || threads.accountId,
    accountId: threads.accountId,
    threadsId: threads.threadsId,
    expiresAt: threads.expiresAt,
    updatedAt: threads.updatedAt,
  }
}

export function ConnectingAppsPage({ onStatusChange, language = 'id' }: { onStatusChange?: (status: ThreadsConnectionStatus) => void; language?: UiLanguage }) {
  const { success: toastSuccess, error: toastError } = useToast()
  const t = (value: string) => translateText(value, language)
  const [isConnectingThreads, setIsConnectingThreads] = useState(false)
  const [isDeletingThreads, setIsDeletingThreads] = useState(false)
  const [isLoadingThreadsStatus, setIsLoadingThreadsStatus] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [threadsConnection, setThreadsConnection] = useState<ThreadsConnectionView | null>(null)
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false)
  const onStatusChangeRef = useRef(onStatusChange)

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (!connected && !error) {
      return
    }

    if (connected === 'true' && !error) {
      toastSuccess(
        'Threads connected',
        language === 'en' ? 'Your Threads account is connected and its status has been updated.' : 'Akun Threads berhasil terhubung dan status koneksi sudah diperbarui.',
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
        onStatusChangeRef.current?.(getThreadsConnectionStatus(nextThreads))
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
      setThreadsConnection({ status: 'disconnected', connected: false, needsReconnect: false })
      invalidateAuthStateCache()
      const authState = await getCurrentAuthState()
      setThreadsConnection(toThreadsConnectionView(authState?.socialAccounts?.threads ?? null))
      onStatusChangeRef.current?.(getThreadsConnectionStatus(authState?.socialAccounts?.threads))
      setIsDisconnectModalOpen(false)
      toastSuccess('Threads unlinked', language === 'en' ? 'Your Threads account connection has been removed.' : 'Koneksi akun Threads berhasil dihapus.')
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
        <p className="eyebrow">{language === 'en' ? 'alurin Account' : 'Akun alurin'}</p>
        <h1>{language === 'en' ? 'Connected Accounts' : 'Akun Terhubung'}</h1>
        <p className="page-description">
          {language === 'en' ? 'Connect your social media account to start automating.' : 'Hubungkan akun media sosial Anda untuk memulai automasi.'}
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
          const connectionStatus = getThreadsConnectionStatus(threadsConnection)
          const canUseThreads = connectionStatus === 'connected'
          const needsReconnect = connectionStatus === 'needs_reconnect'
          const isConnected = canUseThreads
          const handle = isThreads
            ? isConnected
              ? language === 'en'
                ? `Connected${threadsConnection?.username ? ` to ${threadsConnection.username}` : ''}`
                : `Terhubung${threadsConnection?.username ? ` sebagai ${threadsConnection.username}` : ''}`
              : needsReconnect
                ? t('Perlu dihubungkan ulang')
                : isLoadingThreadsStatus
                  ? t('Memeriksa status koneksi...')
                  : t('Belum terhubung')
            : app.handle
          const statusText = isConnected
            ? t('Terhubung')
            : needsReconnect
              ? t('Perlu dihubungkan ulang')
              : null

          return (
            <article className="integration-card" key={app.name}>
              <div className="integration-left">
                <div className="integration-icon">
                  <AppIcon name="link" />
                </div>

                <div className="integration-copy">
                  <strong>{app.name}</strong>
                  <p>{handle}</p>
                  {statusText ? (
                    <span className={`integration-status-text${isConnected ? ' connected' : ''}`}>
                      {statusText}
                    </span>
                  ) : null}
                </div>
              </div>

              {isConnected ? (
                <button
                  className="ghost-button integration-unlink-button"
                  type="button"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  disabled={isDeletingThreads || isConnectingThreads || isLoadingThreadsStatus}
                >
                  <AppIcon name="close" />
                  {isDeletingThreads ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : needsReconnect ? (
                <div className="integration-status">
                  <button
                    className="connect-button"
                    type="button"
                    onClick={handleThreadsConnect}
                    disabled={isConnectingThreads || isLoadingThreadsStatus}
                  >
                    <AppIcon name={isConnectingThreads ? 'link' : 'plus'} />
                    {isConnectingThreads ? t('Menghubungkan...') : t('Hubungkan Ulang Threads')}
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
                  {isConnectingThreads ? t('Menghubungkan...') : 'Connect Threads'}
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

      {isDisconnectModalOpen ? (
        <div
          className="auth-overlay threads-disconnect-modal-overlay"
          onClick={(event) => {
            if (!isDeletingThreads) {
              dismissModal(() => setIsDisconnectModalOpen(false), event.currentTarget)
            }
          }}
        >
          <div
            className="threads-disconnect-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="threads-disconnect-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="threads-disconnect-modal-head">
              <h3 id="threads-disconnect-modal-title">{language === 'en' ? 'Disconnect Threads?' : 'Putuskan koneksi Threads?'}</h3>
              <p>
                {language === 'en'
                  ? 'Your Threads account will be disconnected. You can connect it again whenever you need it.'
                  : 'Koneksi akun Threads akan diputus. Kamu bisa menghubungkannya kembali kapan saja.'}
              </p>
            </div>
            <div className="threads-disconnect-modal-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={(event) => dismissModal(() => setIsDisconnectModalOpen(false), event.currentTarget)}
                disabled={isDeletingThreads}
              >
                {language === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button
                className="connect-button"
                type="button"
                onClick={handleThreadsDelete}
                disabled={isDeletingThreads}
              >
                <AppIcon name="close" />
                {isDeletingThreads ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
