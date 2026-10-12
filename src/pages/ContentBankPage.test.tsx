// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentBankPage } from './ContentBankPage'
import { deleteContentOutput, listContentOutputs, listPublishedPosts, retryContentOutputPost } from '../services/contentOutputs'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('../components/useToast', () => ({ useToast: () => toast }))

vi.mock('../services/contentOutputs', () => ({
  deleteContentOutput: vi.fn(),
  listContentOutputs: vi.fn(),
  listPublishedPosts: vi.fn(),
  retryContentOutputPost: vi.fn(),
  updateContentOutput: vi.fn(),
}))

type ListedOutput = Awaited<ReturnType<typeof listContentOutputs>>[number]

const failedThreadsOutput = {
  id: 'output-failed',
  userId: 'user-1',
  topicId: 'topic-1',
  topic: 'Konten yang gagal',
  title: 'Konten yang gagal',
  content: 'Isi konten gagal',
  contentOutput: '',
  output: '',
  platform: 'Threads',
  status: 'failed',
  additionalPrompt: '',
  personaConfigId: '',
  generatedAt: '',
  createdAt: '',
  scheduledAt: '',
  scheduledJobId: '',
  externalPostId: '',
} as ListedOutput

describe('ContentBankPage failed output retry flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listContentOutputs).mockResolvedValue([failedThreadsOutput])
    vi.mocked(retryContentOutputPost).mockResolvedValue({})
    vi.mocked(deleteContentOutput).mockResolvedValue(null)
  })

  it('shows Retry only for failed Threads content in the Gagal tab', async () => {
    vi.mocked(listContentOutputs).mockResolvedValue([
      failedThreadsOutput,
      { ...failedThreadsOutput, id: 'failed-instagram', title: 'Instagram gagal', platform: 'Instagram' },
      { ...failedThreadsOutput, id: 'approved-threads', title: 'Threads siap', status: 'approved' },
    ])

    render(<ContentBankPage userId="user-1" onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /^gagal\d*$/i }))

    expect(screen.getByText('Konten yang gagal')).toBeTruthy()
    expect(screen.getByText('Instagram gagal')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /retry/i })).toHaveLength(1)
  })

  it('submits a valid retry schedule and refreshes the content into Terjadwal', async () => {
    vi.mocked(listContentOutputs)
      .mockResolvedValueOnce([failedThreadsOutput])
      .mockResolvedValueOnce([{
        ...failedThreadsOutput,
        status: 'approved',
        scheduledAt: '2026-10-13T03:30:00.000Z',
        publishScheduledJobId: 'publish-job-1',
      } as ListedOutput])

    render(<ContentBankPage userId="user-1" onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /^gagal\d*$/i }))
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    const dialog = screen.getByRole('dialog', { name: /retry konten/i })
    const submit = within(dialog).getByRole('button', { name: /jadwalkan retry/i })
    expect(submit.hasAttribute('disabled')).toBe(true)

    fireEvent.change(within(dialog).getByLabelText(/jadwal retry/i), {
      target: { value: '2026-10-13T10:30' },
    })
    expect(submit.hasAttribute('disabled')).toBe(false)
    fireEvent.click(submit)

    await waitFor(() => expect(retryContentOutputPost).toHaveBeenCalledWith({
      contentOutputId: 'output-failed',
      scheduledAt: '2026-10-13T03:30:00.000Z',
    }))
    await waitFor(() => expect(listContentOutputs).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole('button', { name: /terjadwal/i }))
    expect(await screen.findByText('Konten yang gagal')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })

  it('shows only the parent published post link instead of opening review', async () => {
    vi.mocked(listContentOutputs).mockResolvedValue([{
      ...failedThreadsOutput,
      id: 'output-published',
      title: 'Thread yang sudah terbit',
      status: 'published',
      externalPostId: 'threads-post-1',
    }])
    vi.mocked(listPublishedPosts).mockResolvedValue([
      { contentOutputId: 'output-published', postUrl: 'https://www.threads.net/@demo/post/second', status: 'success', sequenceNumber: 2 },
      { contentOutputId: 'output-published', postUrl: 'https://www.threads.net/@demo/post/first', status: 'success', sequenceNumber: 1 },
    ])

    render(<ContentBankPage userId="user-1" onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /^published\d*$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Lihat' }))

    const dialog = await screen.findByRole('dialog', { name: /konten terbit/i })
    expect(dialog.classList.contains('content-bank-published-dialog')).toBe(true)
    expect(dialog.parentElement?.classList.contains('content-bank-published-backdrop')).toBe(true)
    const links = within(dialog).getAllByRole('link', { name: /lihat post/i })
    expect(links).toHaveLength(1)
    expect(links[0].classList.contains('published-post-link')).toBe(true)
    expect(links[0].getAttribute('href')).toBe('https://www.threads.net/@demo/post/first')
    expect(screen.queryByRole('dialog', { name: /review konten/i })).toBeNull()
  })

  it('requires confirmation in an app modal before deleting content', async () => {
    const reviewOutput = { ...failedThreadsOutput, id: 'output-review', title: 'Draft untuk dihapus', status: 'draft' }
    vi.mocked(listContentOutputs).mockResolvedValue([reviewOutput])

    render(<ContentBankPage userId="user-1" onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /hapus output draft untuk dihapus/i }))
    let dialog = screen.getByRole('dialog', { name: /konfirmasi hapus konten/i })
    expect(deleteContentOutput).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: /batal/i }))
    expect(screen.queryByRole('dialog', { name: /konfirmasi hapus konten/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /hapus output draft untuk dihapus/i }))
    dialog = screen.getByRole('dialog', { name: /konfirmasi hapus konten/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /tutup/i }))
    expect(screen.queryByRole('dialog', { name: /konfirmasi hapus konten/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /hapus output draft untuk dihapus/i }))
    dialog = screen.getByRole('dialog', { name: /konfirmasi hapus konten/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /^hapus$/i }))

    await waitFor(() => expect(screen.queryByText('Draft untuk dihapus')).toBeNull())
    expect(screen.queryByRole('dialog', { name: /konfirmasi hapus konten/i })).toBeNull()
  })
})
