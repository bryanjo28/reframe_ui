import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'

import { ToastProvider } from '../src/components/Toast'
import { CreateContentDemoPage } from '../src/pages/CreateContentDemoPage'
import * as contentOutputs from '../src/services/contentOutputs'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('lets a guest generate a demo result before showing login and register CTAs', async () => {
  const user = userEvent.setup()
  vi.spyOn(contentOutputs, 'generateContentOutputDemo').mockResolvedValue({
    content: 'Contoh thread hasil demo',
  })

  render(
    <ToastProvider>
      <CreateContentDemoPage isAuthenticated={false} onRequestAuth={vi.fn()} />
    </ToastProvider>,
  )

  await user.click(screen.getByRole('button', { name: 'Creator educator' }))
  await user.click(screen.getByRole('button', { name: 'Creator pemula' }))
  await user.click(screen.getByRole('button', { name: 'Personal branding' }))
  await user.click(screen.getByRole('button', { name: 'Singkat dan tajam' }))
  await user.click(screen.getByRole('button', { name: 'Generate demo' }))

  expect(await screen.findByText('Contoh thread hasil demo')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Login untuk lanjut' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Buat akun' })).toHaveAttribute('href', '/register')
})
