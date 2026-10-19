import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/Toast'
import { ConnectingAppsPage } from '../src/pages/ConnectingAppsPage'
import { deleteThreadsConnection } from '../src/services/threadsAuth'
import { getCurrentAuthState, invalidateAuthStateCache } from '../src/services/authService'

vi.mock('../src/services/threadsAuth', () => ({
  deleteThreadsConnection: vi.fn(),
  getThreadsAuthorizationUrl: vi.fn(),
}))
vi.mock('../src/services/authService', async (original) => {
  const actual = await original<typeof import('../src/services/authService')>()
  return { ...actual, getCurrentAuthState: vi.fn(), invalidateAuthStateCache: vi.fn() }
})

function renderPage(onStatusChange?: (status: 'connected' | 'needs_reconnect' | 'disconnected') => void) {
  return render(<ToastProvider><ConnectingAppsPage onStatusChange={onStatusChange} /></ToastProvider>)
}

describe('ConnectingAppsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/connecting-apps')
  })

  it('shows reconnect when connected is false but reconnect is required', async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: 'user-1' }, onboarding: null,
      socialAccounts: { threads: { connected: false, needsReconnect: true, status: 'needs_reconnect' } },
    })
    renderPage()
    expect(await screen.findByRole('button', { name: /hubungkan ulang threads/i })).toBeInTheDocument()
    expect(screen.getAllByText('Perlu dihubungkan ulang')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /^disconnect$/i })).not.toBeInTheDocument()
  })

  it('invalidates and refetches account state after disconnect', async () => {
    const onStatusChange = vi.fn()
    vi.mocked(getCurrentAuthState)
      .mockResolvedValueOnce({ user: { id: 'user-1' }, onboarding: null, socialAccounts: { threads: { connected: true, status: 'connected' } } })
      .mockResolvedValueOnce({ user: { id: 'user-1' }, onboarding: null, socialAccounts: { threads: { connected: false, status: 'disconnected' } } })
    vi.mocked(deleteThreadsConnection).mockResolvedValue(undefined)
    renderPage(onStatusChange)
    fireEvent.click(await screen.findByRole('button', { name: /disconnect/i }))
    fireEvent.click(screen.getByRole('dialog').querySelector('.connect-button') as HTMLButtonElement)
    await waitFor(() => expect(invalidateAuthStateCache).toHaveBeenCalledOnce())
    await waitFor(() => expect(getCurrentAuthState).toHaveBeenCalledTimes(2))
    expect(onStatusChange).toHaveBeenLastCalledWith('disconnected')
    expect(await screen.findByRole('button', { name: /^connect threads$/i })).toBeInTheDocument()
  })
})
