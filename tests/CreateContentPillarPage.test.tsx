import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { CreateContentPillarPage } from '../src/pages/CreateContentPillarPage'

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

test('defaults a new content pillar to a short thread', async () => {
  render(
    <ToastProvider>
      <CreateContentPillarPage />
    </ToastProvider>,
  )

  expect(await screen.findByRole('combobox', { name: 'Thread Type' })).toHaveValue('short')
})
