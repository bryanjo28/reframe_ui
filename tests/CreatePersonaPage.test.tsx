import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { CreatePersonaPage } from '../src/pages/CreatePersonaPage'

vi.mock('../src/services/personaConfigs', () => ({
  createPersonaConfig: vi.fn(),
  getPersonaConfigById: vi.fn(),
  listPersonaConfigs: vi.fn().mockResolvedValue([]),
  updatePersonaConfig: vi.fn(),
}))

function renderPage(isInitialSetup: boolean) {
  render(
    <ToastProvider>
      <CreatePersonaPage personaConfig={null} isInitialSetup={isInitialSetup} />
    </ToastProvider>,
  )
}

describe('CreatePersonaPage actions', () => {
  it('shows only Create Persona during the initial setup', () => {
    renderPage(true)

    expect(screen.getByRole('button', { name: 'Simpan & Lanjut' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Persona' })).not.toBeInTheDocument()
  })

  it('keeps New Persona available in the persona management view', () => {
    renderPage(false)

    expect(screen.getByRole('button', { name: 'New Persona' })).toBeInTheDocument()
  })
})
