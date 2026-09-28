import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AuthPage } from '../src/pages/AuthPage'
import * as authService from '../src/services/authService'

describe('AuthPage', () => {
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
