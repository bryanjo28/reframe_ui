// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentEnginePage } from './ContentEnginePage'
import { createContentOutput } from '../services/contentOutputs'

vi.mock('../components/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

vi.mock('../services/contentPillars', () => ({
  listContentPillars: vi.fn().mockResolvedValue([]),
}))

vi.mock('../services/contentTopics', () => ({
  listContentTopics: vi.fn().mockResolvedValue([
    { id: 'topic-1', userId: 'user-1', topic: 'Topic pilihan 1', category: 'education', subcategory: 'Subcategory 1', contentPillarId: 'pillar-1', usedAt: '2026-10-07T08:00:00.000Z', createdAt: '2026-10-01T08:00:00.000Z' },
    { id: 'topic-2', userId: 'user-1', topic: 'Topic pilihan 2', category: 'opinion', subcategory: 'Subcategory 2', contentPillarId: 'pillar-2', usedAt: '2026-10-07T08:00:00.000Z', createdAt: '2026-10-02T08:00:00.000Z' },
    { id: 'topic-3', userId: 'user-1', topic: 'Topic pilihan 3', category: 'education', subcategory: 'Subcategory 3', contentPillarId: 'pillar-3', usedAt: '2026-10-07T08:00:00.000Z', createdAt: '2026-10-03T08:00:00.000Z' },
    { id: 'topic-4', userId: 'user-1', topic: 'Topic pilihan 4', category: 'opinion', subcategory: 'Subcategory 4', contentPillarId: 'pillar-4', usedAt: '2026-10-07T08:00:00.000Z', createdAt: '2026-10-04T08:00:00.000Z' },
    { id: 'topic-5', userId: 'user-1', topic: 'Topic pilihan 5', category: 'education', subcategory: 'Subcategory 5', contentPillarId: 'pillar-5', usedAt: '2026-10-07T08:00:00.000Z', createdAt: '2026-10-05T08:00:00.000Z' },
    { id: 'topic-6', userId: 'user-1', topic: 'Topic pilihan 6', category: 'opinion', subcategory: 'Subcategory 6', contentPillarId: 'pillar-6', usedAt: '2026-10-07T08:00:00.000Z', createdAt: '2026-10-06T08:00:00.000Z' },
  ]),
  getContentTopicById: vi.fn().mockImplementation((id: string) => {
    const number = Number(id.replace('topic-', ''))
    return Promise.resolve({
      id,
      userId: 'user-1',
      topic: `Topic pilihan ${number}`,
      category: number % 2 ? 'education' : 'opinion',
      subcategory: `Subcategory ${number}`,
      contentPillarId: `pillar-${number}`,
      usedAt: '2026-10-07T08:00:00.000Z',
      createdAt: `2026-10-0${number}T08:00:00.000Z`,
    })
  }),
}))

vi.mock('../services/contentOutputs', () => ({
  autoGenerateContentOutputs: vi.fn(),
  createContentOutput: vi.fn().mockResolvedValue({ data: [] }),
  deleteContentOutput: vi.fn(),
  getScheduledJobId: vi.fn(),
  listContentOutputs: vi.fn().mockResolvedValue([]),
  retryContentOutputPost: vi.fn(),
  updateContentOutput: vi.fn(),
}))

describe('ContentEnginePage topic generation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.setItem('reframe.authToken', 'test-token')
  })

  it('opens directly in topic generation without scheduling controls', async () => {
    render(<ContentEnginePage userId="user-1" />)

    expect(await screen.findByRole('heading', { name: /buat variant dari satu topic/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /by pillar/i })).toBeNull()
    expect(screen.queryByText(/buat nanti/i)).toBeNull()
    expect(screen.queryByLabelText(/tanggal.*waktu/i)).toBeNull()
  })

  it('shows five simplified topic rows per page', async () => {
    render(<ContentEnginePage userId="user-1" />)

    const table = await screen.findByRole('table', { name: /daftar topic/i })
    expect(within(table).getByRole('columnheader', { name: 'Topic' })).toBeTruthy()
    expect(within(table).getByRole('columnheader', { name: 'Category' })).toBeTruthy()
    expect(within(table).getByRole('columnheader', { name: 'Created At' })).toBeTruthy()
    expect(within(table).queryByRole('columnheader', { name: /content pillar/i })).toBeNull()
    expect(within(table).queryByRole('columnheader', { name: /used at/i })).toBeNull()
    expect(within(table).queryByText(/subcategory/i)).toBeNull()
    expect(screen.queryByText('Content Pillar')).toBeNull()
    expect(screen.queryByText('Subcategory')).toBeNull()
    expect(screen.queryByText('Used At')).toBeNull()
    expect(within(table).getAllByRole('row')).toHaveLength(6)

    fireEvent.click(screen.getByRole('button', { name: /halaman berikutnya/i }))
    expect(await within(table).findByText('Topic pilihan 1')).toBeTruthy()
  })

  it('uses a mobile topic picker and submits only once', async () => {
    const onViewContentBank = vi.fn()
    render(<ContentEnginePage userId="user-1" onViewContentBank={onViewContentBank} />)

    fireEvent.click(await screen.findByRole('button', { name: /ganti topic/i }))
    const picker = screen.getByRole('dialog', { name: /pilih topic/i })
    fireEvent.click(within(picker).getByRole('button', { name: /pilih topic pilihan 4/i }))

    expect(screen.queryByRole('dialog', { name: /pilih topic/i })).toBeNull()
    const increaseButton = screen.getByRole('button', { name: /tambah jumlah variant/i })
    fireEvent.click(increaseButton)
    fireEvent.click(increaseButton)

    const generateButton = screen.getByRole('button', { name: /generate 3 variants/i })
    fireEvent.click(generateButton)
    fireEvent.click(generateButton)

    expect(createContentOutput).toHaveBeenCalledTimes(1)
    expect(createContentOutput).toHaveBeenCalledWith({
      topicId: 'topic-4',
      variantCount: 3,
      additionalPrompt: '',
    })
    await waitFor(() => expect(onViewContentBank).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('heading', { name: /preview variant/i })).toBeNull()
  })
})
