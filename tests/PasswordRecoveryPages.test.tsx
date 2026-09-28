import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ForgotPasswordPage } from '../src/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../src/pages/ResetPasswordPage'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the generic success message after submitting an email', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    render(<ForgotPasswordPage />)

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Kirim link reset password' }))

    expect(
      await screen.findByText('Jika email terdaftar, link reset password telah dikirim'),
    ).toBeInTheDocument()
  })

  it('shows an error when the backend rejects the request', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    render(<ForgotPasswordPage />)

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Kirim link reset password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal mengirim link reset password')
  })
})

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/reset-password')
  })

  it('rejects a missing or invalid recovery token', () => {
    render(<ResetPasswordPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Link reset password tidak valid atau kedaluwarsa')
    expect(screen.queryByRole('button', { name: 'Ubah password' })).not.toBeInTheDocument()
  })

  it('validates password length before sending the request', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/reset-password#access_token=token-123&type=recovery')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ResetPasswordPage />)

    await user.type(screen.getByLabelText('Password baru'), '1234567')
    await user.type(screen.getByLabelText('Konfirmasi password baru'), '1234567')
    await user.click(screen.getByRole('button', { name: 'Ubah password' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Password minimal 8 karakter')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits a valid password and completes the recovery flow', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    window.history.replaceState({}, '', '/reset-password#access_token=token-123&type=recovery')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    render(<ResetPasswordPage onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('Password baru'), 'password-baru')
    await user.type(screen.getByLabelText('Konfirmasi password baru'), 'password-baru')
    await user.click(screen.getByRole('button', { name: 'Ubah password' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
  })
})
