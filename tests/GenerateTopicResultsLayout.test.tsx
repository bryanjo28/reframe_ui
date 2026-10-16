import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { GenerateTopicPage } from '../src/pages/GenerateTopicPage'
import { createContentTopic, generateContentTopics } from '../src/services/contentTopics'
import { listContentPillars } from '../src/services/contentPillars'

vi.mock('../src/services/contentTopics', () => ({
  createContentTopic: vi.fn(),
  generateContentTopics: vi.fn(),
}))

vi.mock('../src/services/contentPillars', () => ({
  listContentPillars: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(listContentPillars).mockResolvedValue([
    {
      id: 'pillar-1',
      userId: 'user-1',
      personaConfigId: 'persona-1',
      name: 'Automotive Tips & Insights',
    },
  ])

  vi.mocked(generateContentTopics).mockResolvedValue({
    data: {
      topics: [
        {
          title: 'Jangan Beli Mobil Bekas Sebelum Cek Ini',
          category_type: 'tutorial',
        },
      ],
    },
  })

  vi.mocked(createContentTopic).mockResolvedValue({ id: 'saved-topic' })
})

test('skips the legacy topic-selection dialog after generating topics', async () => {
  const user = userEvent.setup()

  render(
    <ToastProvider>
      <GenerateTopicPage userId="user-1" />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Cari 5 Ide' }))

  await waitFor(() => expect(createContentTopic).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('dialog', { name: 'Hasil ide' })).not.toBeInTheDocument()
})

test('saves every generated topic before opening the topic list', async () => {
  const user = userEvent.setup()
  const onContinueToContent = vi.fn()
  let finishFirstSave: (() => void) | undefined

  vi.mocked(generateContentTopics).mockResolvedValue({
    data: {
      topics: [
        { title: 'Ide pertama', category_type: 'tutorial' },
        { title: 'Ide kedua', category_type: 'opinion' },
      ],
    },
  })
  vi.mocked(createContentTopic)
    .mockImplementationOnce(
      () => new Promise((resolve) => {
        finishFirstSave = () => resolve({ id: 'topic-1' })
      }),
    )
    .mockResolvedValueOnce({ id: 'topic-2' })

  render(
    <ToastProvider>
      <GenerateTopicPage userId="user-1" onContinueToContent={onContinueToContent} />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Cari 5 Ide' }))

  await waitFor(() => expect(createContentTopic).toHaveBeenCalledTimes(1))
  expect(onContinueToContent).not.toHaveBeenCalled()

  finishFirstSave?.()

  await waitFor(() => expect(createContentTopic).toHaveBeenCalledTimes(2))
  expect(createContentTopic).toHaveBeenNthCalledWith(1, {
    userId: 'user-1',
    personaConfigId: 'persona-1',
    contentPillarId: 'pillar-1',
    category: 'tutorial',
    subcategory: '',
    topic: 'Ide pertama',
  })
  expect(createContentTopic).toHaveBeenNthCalledWith(2, {
    userId: 'user-1',
    personaConfigId: 'persona-1',
    contentPillarId: 'pillar-1',
    category: 'opinion',
    subcategory: '',
    topic: 'Ide kedua',
  })
  await waitFor(() => expect(onContinueToContent).toHaveBeenCalledTimes(1))
})
