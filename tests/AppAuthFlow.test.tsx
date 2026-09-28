import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'

import App from '../src/App'
import { clearAuthSession } from '../src/services/authService'

beforeEach(() => {
  clearAuthSession()
  localStorage.clear()
  window.history.replaceState({}, '', '/login')
  vi.restoreAllMocks()
})

it('uses auth me onboarding state to route a new user to first setup after login', async () => {
  const user = userEvent.setup()
  let authMeRequests = 0

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const pathname = new URL(input.toString()).pathname

      if (pathname === '/api/auth/me') {
        authMeRequests += 1
        const headers = init?.headers as Record<string, string> | undefined

        if (!headers?.Authorization) {
          return new Response(null, { status: 401 })
        }

        return new Response(
          JSON.stringify({
            data: {
              user: { id: 'user-1', email: 'user@example.com' },
              onboarding: { hasPersona: false },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (pathname === '/api/auth/login') {
        return new Response(
          JSON.stringify({
            data: {
              user: { id: 'user-1', email: 'user@example.com' },
              accessToken: 'access-token',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Login ke workspace kamu' })).toBeInTheDocument()

  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
  await user.type(screen.getByLabelText('Password'), 'password-baru')
  await user.click(screen.getAllByRole('button', { name: 'Login' }).at(-1)!)

  expect(await screen.findByRole('heading', { name: 'Lengkapi Persona Pertama' })).toBeInTheDocument()
  await waitFor(() => expect(window.location.pathname).toBe('/first-setup'))
  expect(authMeRequests).toBe(2)
})

it('routes a registration requiring confirmation to check email without opening setup', async () => {
  const user = userEvent.setup()
  window.history.replaceState({}, '', '/register')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const pathname = new URL(input.toString()).pathname

      if (pathname === '/api/auth/me') {
        return new Response(null, { status: 401 })
      }

      if (pathname === '/api/auth/register') {
        return new Response(
          JSON.stringify({ data: { emailConfirmationRequired: true } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(null, { status: 404 })
    }),
  )

  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Buat akun baru dulu' })).toBeInTheDocument()

  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
  await user.type(screen.getByRole('textbox', { name: 'Username' }), 'new-user')
  await user.type(screen.getByLabelText('Password'), 'password-baru')
  await user.click(screen.getAllByRole('button', { name: 'Register' }).at(-1)!)

  expect(await screen.findByRole('heading', { name: 'Cek email kamu dulu' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Lengkapi Persona Pertama' })).not.toBeInTheDocument()
  expect(window.location.pathname).toBe('/check-email')
  expect(localStorage.getItem('reframe.authToken')).toBeNull()
})

it('routes an authenticated user with a persona to the dashboard', async () => {
  localStorage.setItem('reframe.authToken', 'access-token')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const pathname = new URL(input.toString()).pathname

      if (pathname === '/api/auth/me') {
        return new Response(
          JSON.stringify({
            data: {
              user: { id: 'user-1', email: 'user@example.com' },
              onboarding: { hasPersona: true },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (pathname === '/api/persona-configs') {
        return new Response(
          JSON.stringify({ data: [{ id: 'persona-1', userId: 'user-1', persona: 'Creator' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Dashboard Reframe yang lebih fokus.' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/dashboard')
})
