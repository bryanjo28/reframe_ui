import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { CreatePersonaPage } from '../src/pages/CreatePersonaPage'
import { listPersonaConfigs } from '../src/services/personaConfigs'
import { listSubscriptionPlans, normalizeSubscriptionPlan } from '../src/services/subscriptionPlans'
import { UPGRADE_PLAN_REQUIRED_EVENT } from '../src/utils/apiError'

vi.mock('../src/services/subscriptionPlans', async (original) => ({ ...await original<typeof import('../src/services/subscriptionPlans')>(), getCurrentSubscription: vi.fn().mockResolvedValue(null), listSubscriptionPlans: vi.fn().mockResolvedValue([]) }))

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
  it('locks adding a persona at the plan limit and keeps the current fields', async () => {
    const persona = { id: 'persona-1', persona: 'Creator' }
    vi.mocked(listPersonaConfigs).mockResolvedValueOnce([persona])
    vi.mocked(listSubscriptionPlans).mockResolvedValueOnce([normalizeSubscriptionPlan({ code: 'free', maxPersonas: 1 })])
    const locked = vi.fn()
    window.addEventListener(UPGRADE_PLAN_REQUIRED_EVENT, locked)
    render(<ToastProvider><CreatePersonaPage personaConfig={persona} /></ToastProvider>)
    const add = screen.getByRole('button', { name: 'New Persona' })
    await waitFor(() => expect(add).toBeEnabled())
    fireEvent.click(add)
    expect(locked).toHaveBeenCalledOnce()
    expect(screen.getByRole('textbox', { name: 'Persona' })).toHaveValue('Creator')
    expect(screen.queryByText('Saved Versions')).not.toBeInTheDocument()
    window.removeEventListener(UPGRADE_PLAN_REQUIRED_EVENT, locked)
  })

  it('clears all editable fields when adding a persona below the limit', async () => {
    vi.mocked(listSubscriptionPlans).mockResolvedValueOnce([normalizeSubscriptionPlan({ code: 'free', maxPersonas: 2 })])
    render(<ToastProvider><CreatePersonaPage personaConfig={{ id: 'persona-1', persona: 'Creator', goal: 'Growth' }} /></ToastProvider>)
    const add = screen.getByRole('button', { name: 'New Persona' })
    await waitFor(() => expect(add).toBeEnabled())
    fireEvent.click(add)
    expect(screen.getByRole('textbox', { name: 'Persona' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Goal' })).toHaveValue('')
  })
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
