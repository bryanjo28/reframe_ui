import { useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { getThreadsAuthorizationUrl } from '../services/threadsAuth'

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
  {
    name: 'Instagram',
    handle: 'Terhubung sebagai @yourhandle',
    connected: true,
    provider: 'instagram',
  },
  {
    name: 'TikTok',
    handle: 'Belum terhubung',
    connected: false,
    provider: 'tiktok',
  },
  {
    name: 'Facebook',
    handle: 'Terhubung sebagai Your Page',
    connected: true,
    provider: 'facebook',
  },
  {
    name: 'YouTube',
    handle: 'Belum terhubung',
    connected: false,
    provider: 'youtube',
  },
]

type ConnectingAppsPageProps = {
  userId: string
}

export function ConnectingAppsPage({ userId }: ConnectingAppsPageProps) {
  const [isConnectingThreads, setIsConnectingThreads] = useState(false)
  const [connectionError, setConnectionError] = useState('')

  async function handleThreadsConnect() {
    try {
      setConnectionError('')
      setIsConnectingThreads(true)

      const authorizationUrl = await getThreadsAuthorizationUrl(userId)
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

          return (
            <article className="integration-card" key={app.name}>
              <div className="integration-left">
                <div className="integration-icon">
                  <AppIcon name="link" />
                </div>

                <div className="integration-copy">
                  <strong>{app.name}</strong>
                  <p>{app.handle}</p>
                </div>
              </div>

              {app.connected ? (
                <div className="integration-status">
                  <span className="status-inline success">
                    <AppIcon name="check" />
                    Terhubung
                  </span>
                </div>
              ) : isThreads ? (
                <button
                  className="connect-button"
                  type="button"
                  onClick={handleThreadsConnect}
                  disabled={isConnectingThreads}
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

      <div className="integration-note">
        <AppIcon name="info" />
        <p>
          Flow Threads: FE memanggil backend connect dengan `userId`, backend
          mengembalikan `authorizationUrl`, lalu user diarahkan ke Threads untuk
          login dan approval.
        </p>
      </div>
    </section>
  )
}
