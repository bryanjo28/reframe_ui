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

    expect(
      screen.getByRole('heading', { name: 'Ubah satu ide menjadi thread yang siap posting.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Demo gratis')).toBeInTheDocument()
  })

  it('renders the privacy policy without requiring authentication', () => {
    window.history.replaceState({}, '', '/privacy-policy')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Kebijakan Privasi' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Penghapusan data' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Syarat & Ketentuan' })).toHaveAttribute('href', '/terms-of-service')
  })

  it('renders the terms of service without requiring authentication', () => {
    window.history.replaceState({}, '', '/terms-of-service')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Syarat & Ketentuan' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1. Ruang lingkup layanan' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. Harga, langganan, dan pembayaran' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kebijakan Privasi' })).toHaveAttribute('href', '/privacy-policy')
  })

  it('renders check-email with the stored registration email', () => {
    localStorage.setItem('alurin.pendingVerificationEmail', 'user@example.com')
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
