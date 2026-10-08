import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { GenerateTopicPage } from '../src/pages/GenerateTopicPage'
import { generateContentTopics } from '../src/services/contentTopics'
import { listContentPillars } from '../src/services/contentPillars'

vi.mock('../src/services/contentTopics', () => ({
  createContentTopic: vi.fn(),
  generateContentTopics: vi.fn(),
}))

vi.mock('../src/services/contentPillars', () => ({
  listContentPillars: vi.fn(),
}))

beforeEach(() => {
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
})

test('shows one results heading and one localized idea count after generating topics', async () => {
  const user = userEvent.setup()

  render(
    <ToastProvider>
      <GenerateTopicPage userId="user-1" />
    </ToastProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'Cari 5 Ide' }))

  expect(await screen.findByDisplayValue('Jangan Beli Mobil Bekas Sebelum Cek Ini')).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { name: 'Ide untuk kamu' })).toHaveLength(1)
  expect(screen.getAllByText('1 ide')).toHaveLength(1)
  expect(screen.queryByText('1 items')).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Judul ide' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Kategori' })).toBeInTheDocument()
  expect(screen.getByRole('toolbar', { name: 'Aksi ide terpilih' })).toBeInTheDocument()
})
