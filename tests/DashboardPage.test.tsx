import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '../src/pages/DashboardPage'
import { listContentOutputs } from '../src/services/contentOutputs'
import { listContentPillars } from '../src/services/contentPillars'
import { listContentTopics } from '../src/services/contentTopics'

vi.mock('../src/services/contentOutputs', () => ({ listContentOutputs: vi.fn() }))
vi.mock('../src/services/contentPillars', () => ({ listContentPillars: vi.fn() }))
vi.mock('../src/services/contentTopics', () => ({ listContentTopics: vi.fn() }))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listContentPillars).mockResolvedValue([{ id: 'pillar-1' }])
    vi.mocked(listContentTopics).mockResolvedValue([])
    vi.mocked(listContentOutputs).mockResolvedValue([{ id: 'output-1', status: 'approved', title: 'Siap posting' }])
  })

  it('offers reconnect for an expired Threads connection', async () => {
    const onNavigate = vi.fn()
    render(<DashboardPage activePage="dashboard" userId="user-1" onNavigate={onNavigate} threadsStatus="needs_reconnect" />)
    fireEvent.click(await screen.findByRole('button', { name: /hubungkan ulang threads/i }))
    expect(onNavigate).toHaveBeenCalledWith('connecting-apps')
  })

  it('clears stale dashboard data and shows a load error', async () => {
    const view = render(<DashboardPage activePage="dashboard" userId="user-1" onNavigate={vi.fn()} threadsStatus="connected" />)
    expect(await screen.findByText('Siap posting')).toBeInTheDocument()
    vi.mocked(listContentOutputs).mockRejectedValueOnce(new Error('offline'))
    view.rerender(<DashboardPage activePage="dashboard" userId="user-2" onNavigate={vi.fn()} threadsStatus="connected" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/dashboard/i)
    await waitFor(() => expect(screen.queryByText('Siap posting')).not.toBeInTheDocument())
  })
})
