import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { CreateContentPillarPage } from '../src/pages/CreateContentPillarPage'
import { getContentPillarById, listContentPillars } from '../src/services/contentPillars'
import { listPersonaConfigs } from '../src/services/personaConfigs'

vi.mock('../src/services/contentPillars', () => ({
  createContentPillar: vi.fn(),
  deleteContentPillar: vi.fn(),
  getContentPillarById: vi.fn(),
  listContentPillars: vi.fn().mockResolvedValue([]),
  updateContentPillar: vi.fn(),
}))

vi.mock('../src/services/personaConfigs', () => ({
  listPersonaConfigs: vi.fn().mockResolvedValue([]),
}))

beforeEach(() => {
  vi.mocked(listContentPillars).mockResolvedValue([])
  vi.mocked(listPersonaConfigs).mockResolvedValue([])
  vi.mocked(getContentPillarById).mockReset()
})

test('defaults a new content pillar to a short thread', async () => {
  render(
    <ToastProvider>
      <CreateContentPillarPage />
    </ToastProvider>,
  )

  expect(await screen.findByRole('combobox', { name: 'Thread Type' })).toHaveValue('short')
})

test('loads the newest saved content pillar when the persona changes', async () => {
  vi.mocked(listPersonaConfigs).mockResolvedValue([
    { id: 'persona-1', persona: 'Founder' },
    { id: 'persona-2', persona: 'Creator' },
  ])
  vi.mocked(listContentPillars).mockResolvedValue([
    { id: 'pillar-old', personaConfigId: 'persona-2', name: 'Old pillar', updatedAt: '2026-09-01T00:00:00.000Z' },
    { id: 'pillar-new', personaConfigId: 'persona-2', name: 'Newest pillar', updatedAt: '2026-10-01T00:00:00.000Z' },
  ])
  vi.mocked(getContentPillarById).mockResolvedValue({
    id: 'pillar-new',
    personaConfigId: 'persona-2',
    name: 'Newest pillar',
    threadType: 'long',
    templateContent: 'Saved template',
    targetObjective: 'Saved objective',
    audienceSegment: 'Saved audience',
    keyMessage: 'Saved message',
    ctaDirection: 'Saved CTA',
    affiliateLink: '',
  })

  render(<ToastProvider><CreateContentPillarPage /></ToastProvider>)

  await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Pilih Persona' }), 'persona-2')

  expect(await screen.findByRole('textbox', { name: 'Nama Content Pillar' })).toHaveValue('Newest pillar')
  expect(screen.getByRole('combobox', { name: 'Thread Type' })).toHaveValue('long')
})

test('clears the content pillar form when the selected persona has no saved pillar', async () => {
  vi.mocked(listPersonaConfigs).mockResolvedValue([
    { id: 'persona-1', persona: 'Founder' },
    { id: 'persona-new', persona: 'New persona' },
  ])
  vi.mocked(listContentPillars).mockResolvedValue([
    { id: 'pillar-1', personaConfigId: 'persona-1', name: 'Founder pillar' },
    { id: 'pillar-2', personaConfigId: 'persona-1', name: 'Founder pillar two' },
  ])

  render(<ToastProvider><CreateContentPillarPage /></ToastProvider>)

  const nameField = await screen.findByRole('textbox', { name: 'Nama Content Pillar' })
  await userEvent.type(nameField, 'Unsaved value')
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Pilih Persona' }), 'persona-new')

  await waitFor(() => expect(nameField).toHaveValue(''))
  expect(screen.getByRole('combobox', { name: 'Thread Type' })).toHaveValue('short')
})
