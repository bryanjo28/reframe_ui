import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CheckEmailPage } from '../src/pages/CheckEmailPage'

describe('CheckEmailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the destination email and can resend verification', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    render(<CheckEmailPage email="user@example.com" />)

    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Login' })).toHaveAttribute('href', '/login')

    await user.click(screen.getByRole('button', { name: 'Kirim ulang verifikasi' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Email verifikasi telah dikirim ulang')
  })

  it('shows a resend error from the backend', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    render(<CheckEmailPage email="user@example.com" />)

    await user.click(screen.getByRole('button', { name: 'Kirim ulang verifikasi' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal mengirim ulang email verifikasi')
  })
})
