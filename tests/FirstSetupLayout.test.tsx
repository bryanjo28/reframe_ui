import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import App from '../src/App'
import { clearAuthSession } from '../src/services/authService'

// Keep the real app shell and route transitions; isolate form persistence here.
vi.mock('../src/pages/PersonalizePage', () => ({
  PersonalizePage: ({ personaConfig, initialTab, onPersonaSaved, onPillarSaved }: {
    personaConfig: unknown; initialTab?: string
    onPersonaSaved: (config: { id: string; persona: string }) => void
    onPillarSaved?: () => void
  }) => <section>
    <h1>{personaConfig ? `Setup ${initialTab}` : 'Setup persona'}</h1>
    {!personaConfig ? <button onClick={() => onPersonaSaved({ id: 'persona-1', persona: 'Creator' })}>Save persona</button>
      : <button onClick={onPillarSaved}>Save pillar</button>}
  </section>,
}))

beforeEach(() => {
  clearAuthSession()
  localStorage.clear()
  localStorage.setItem('alurin.authToken', 'setup-token')
  localStorage.setItem('alurin:onboarding:tutorialCompleted', 'true')
  window.history.replaceState({}, '', '/first-setup')
})

function mockSession(hasPersona: boolean, pillarLookupFails = false) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const path = new URL(input.toString()).pathname
    if (path === '/api/content-pillars' && pillarLookupFails) return new Response(null, { status: 500 })
    const data = path === '/api/auth/me'
      ? { user: { id: 'setup-user' }, onboarding: { hasPersona } }
      : path === '/api/persona-configs' && hasPersona
        ? [{ id: 'persona-1', userId: 'setup-user', persona: 'Creator' }]
        : []
    return new Response(JSON.stringify({ data }), { status: 200 })
  }))
}

it('keeps both first-setup steps immersive until the pillar is saved', async () => {
  mockSession(false)
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Save persona' }))
  expect(await screen.findByRole('heading', { name: 'Setup content-pillar' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/first-setup')
  expect(document.querySelector('.dashboard-shell')).toBeNull()
  expect(screen.queryByRole('button', { name: /AI Credits/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Save pillar' }))
  await waitFor(() => expect(document.querySelector('.dashboard-shell')).not.toBeNull())
  expect(window.location.pathname).toBe('/dashboard')
})

it('resumes the pillar step without dashboard chrome after refreshing first setup', async () => {
  mockSession(true)
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Setup content-pillar' })).toBeInTheDocument()
  expect(document.querySelector('.dashboard-shell')).toBeNull()
  expect(window.location.pathname).toBe('/first-setup')
})

it('keeps the dashboard shell when editing an existing content pillar', async () => {
  window.history.replaceState({}, '', '/dashboard')
  localStorage.setItem('alurin.activePage', 'content-pillar')
  mockSession(true)
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Setup content-pillar' })).toBeInTheDocument()
  expect(document.querySelector('.dashboard-shell')).not.toBeNull()
  expect(window.location.pathname).toBe('/dashboard')
})

it('keeps a valid login and setup layout if the pillar lookup fails', async () => {
  mockSession(true, true)
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Setup content-pillar' })).toBeInTheDocument()
  expect(localStorage.getItem('alurin.authToken')).toBe('setup-token')
  expect(document.querySelector('.dashboard-shell')).toBeNull()
})
