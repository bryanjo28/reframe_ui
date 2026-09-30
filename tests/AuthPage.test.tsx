import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AuthPage } from '../src/pages/AuthPage'
import * as authService from '../src/services/authService'

describe('AuthPage', () => {
  it('submits full name and account name as separate registration fields', async () => {
    const user = userEvent.setup()
    const registerSpy = vi.spyOn(authService, 'register').mockResolvedValue({
      emailConfirmationRequired: true,
      session: null,
    })

    render(<AuthPage onAuthenticated={vi.fn()} initialMode="register" />)

    await user.type(screen.getByRole('textbox', { name: 'Full Name' }), '  Bryan Jonathan  ')
    await user.type(screen.getByRole('textbox', { name: 'Username' }), '  BryanJon  ')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), '  BryanJo2324@GMAIL.COM  ')
    await user.type(screen.getByLabelText('Password'), 'Password123')
    await user.type(screen.getByLabelText('Konfirmasi Password'), 'Password123')
    await user.click(screen.getAllByRole('button', { name: 'Register' }).at(-1)!)

    expect(registerSpy).toHaveBeenCalledWith({
      fullName: 'Bryan Jonathan',
      accountName: 'bryanjon',
      email: 'bryanjo2324@gmail.com',
      password: 'Password123',
    })
  })

  it('rejects a registration when password confirmation does not match', async () => {
    const user = userEvent.setup()
    const registerSpy = vi.spyOn(authService, 'register').mockResolvedValue({
      emailConfirmationRequired: true,
      session: null,
    })

    render(<AuthPage onAuthenticated={vi.fn()} initialMode="register" />)

    await user.type(screen.getByRole('textbox', { name: 'Full Name' }), 'New User')
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'new-user')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText('Konfirmasi Password'), 'Password2')
    await user.click(screen.getAllByRole('button', { name: 'Register' }).at(-1)!)

    expect(screen.getByText('Konfirmasi password tidak sama.')).toBeInTheDocument()
    expect(registerSpy).not.toHaveBeenCalled()
  })

  it('shows a small forgot-password link below the login password field', () => {
    render(<AuthPage onAuthenticated={vi.fn()} initialMode="login" />)

    const link = screen.getByRole('link', { name: 'Forgot password?' })

    expect(link).toHaveAttribute('href', '/forgot-password')
    expect(link.closest('.auth-password-group')).toBeInTheDocument()
  })

  it('routes an unverified login back to check email', async () => {
    const user = userEvent.setup()
    const onEmailNotVerified = vi.fn()
    vi.spyOn(authService, 'login').mockRejectedValue(
      new authService.AuthRequestError('Email belum diverifikasi.', 'EMAIL_NOT_VERIFIED'),
    )
    render(
      <AuthPage
        onAuthenticated={vi.fn()}
        onEmailNotVerified={onEmailNotVerified}
        initialMode="login"
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-baru')
    await user.click(screen.getAllByRole('button', { name: 'Login' }).at(-1)!)

    expect(onEmailNotVerified).toHaveBeenCalledWith('user@example.com')
  })
})
