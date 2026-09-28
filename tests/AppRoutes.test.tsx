import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import App from '../src/App'

describe('public auth routes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the forgot-password page at its public URL', () => {
    window.history.replaceState({}, '', '/forgot-password')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirim link reset password' })).toBeInTheDocument()
  })

  it('renders the public content demo at the frontend root', () => {
    window.history.replaceState({}, '', '/')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Generate viral threads dalam 10 detik' })).toBeInTheDocument()
    expect(screen.getByText('Free demo')).toBeInTheDocument()
  })

  it('renders check-email with the stored registration email', () => {
    localStorage.setItem('reframe.pendingVerificationEmail', 'user@example.com')
    window.history.replaceState({}, '', '/check-email')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Cek email kamu dulu' })).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('renders the email-confirmed page with a login link', () => {
    window.history.replaceState({}, '', '/email-confirmed#access_token=verification-token')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Email berhasil diverifikasi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
    expect(window.location.hash).toBe('')
  })

  it('handles a Supabase signup callback that returns to the frontend root', () => {
    window.history.replaceState({}, '', '/#access_token=verification-token&type=signup')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Email berhasil diverifikasi' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/email-confirmed')
    expect(window.location.hash).toBe('')
  })
})
