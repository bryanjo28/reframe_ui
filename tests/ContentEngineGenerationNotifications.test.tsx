import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { ContentEnginePage } from '../src/pages/ContentEnginePage'
import { autoGenerateContentOutputs } from '../src/services/contentOutputs'

vi.mock('../src/services/contentPillars', () => ({
  listContentPillars: vi.fn().mockResolvedValue([
    { id: 'pillar-1', name: 'Gaming Hot Takes', userId: 'user-1' },
  ]),
}))

vi.mock('../src/services/contentTopics', () => ({
  listContentTopics: vi.fn().mockResolvedValue([
    { id: 'topic-1', contentPillarId: 'pillar-1', topic: 'One available idea', usedAt: null },
  ]),
}))

vi.mock('../src/services/contentOutputs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/contentOutputs')>()
  return {
    ...actual,
    autoGenerateContentOutputs: vi.fn().mockResolvedValue({ data: { id: 'job-1' } }),
    listContentOutputs: vi.fn().mockResolvedValue([]),
  }
})

test('shows the success notification only after the background generation job completes', async () => {
  const user = userEvent.setup()
  const view = render(
    <ToastProvider>
      <ContentEnginePage userId="user-1" onScheduledJobCreated={vi.fn()} />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Buat 1 Konten' }))
  await waitFor(() => expect(autoGenerateContentOutputs).toHaveBeenCalled())
  expect(screen.queryByText('Konten berhasil dibuat')).not.toBeInTheDocument()

  view.rerender(
    <ToastProvider>
      <ContentEnginePage
        userId="user-1"
        onScheduledJobCreated={vi.fn()}
        {...({ generationCompletion: { jobId: 'job-1', status: 'completed' } } as object)}
      />
    </ToastProvider>,
  )

  expect(await screen.findByText('Konten berhasil dibuat')).toBeInTheDocument()
})

test('shows a friendly backend error when generation completes with errors', async () => {
  render(
    <ToastProvider>
      <ContentEnginePage
        userId="user-1"
        {...({
          generationCompletion: {
            jobId: 'job-error',
            status: 'completed_with_errors',
            errorMessage: 'Daily generation limit exceeded',
          },
        } as object)}
      />
    </ToastProvider>,
  )

  expect(await screen.findAllByText('Batas generate konten harian Anda sudah habis.')).toHaveLength(2)
  expect(screen.queryByText('Konten berhasil dibuat')).not.toBeInTheDocument()
})
