import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthPage } from '../src/pages/AuthPage'

beforeEach(() => localStorage.clear())

async function submitRegistration(error: { code: string; message: string }) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(error), {
    status: 409,
    headers: { 'Content-Type': 'application/json' },
  })))
  const user = userEvent.setup()
  render(<AuthPage initialMode="register" onAuthenticated={() => {}} />)
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'used@example.com')
  await user.type(screen.getByRole('textbox', { name: 'Full Name' }), 'Test User')
  await user.type(screen.getByRole('textbox', { name: 'Username' }), 'used-name')
  await user.type(screen.getByLabelText('Password'), 'Password1')
  await user.type(screen.getByLabelText('Konfirmasi Password'), 'Password1')
  await user.click(screen.getByRole('button', { name: 'Daftar' }))
}

it('clearly identifies an email that is already registered', async () => {
  await submitRegistration({ code: 'EMAIL_ALREADY_EXISTS', message: 'already exists' })
  const message = 'Email ini sudah terdaftar. Gunakan email lain atau login jika ini akun kamu.'
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByText(message, { selector: 'small' })).toBeInTheDocument()
})

it('clearly identifies a username that is already taken', async () => {
  await submitRegistration({ code: 'USERNAME_ALREADY_EXISTS', message: 'username taken' })
  const message = 'Username ini sudah dipakai. Coba gunakan username lain.'
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByText(message, { selector: 'small' })).toBeInTheDocument()
})
