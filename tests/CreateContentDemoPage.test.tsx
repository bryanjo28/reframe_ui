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

it('sends a guest to login without calling the paused demo API', async () => {
  const user = userEvent.setup()
  const onRequestAuth = vi.fn()
  const generateDemo = vi.spyOn(contentOutputs, 'generateContentOutputDemo')

  render(
    <ToastProvider>
      <CreateContentDemoPage isAuthenticated={false} onRequestAuth={onRequestAuth} />
    </ToastProvider>,
  )

  await user.click(screen.getByRole('button', { name: 'Creator educator' }))
  await user.click(screen.getByRole('button', { name: 'Creator pemula' }))
  await user.click(screen.getByRole('button', { name: 'Personal branding' }))
  await user.click(screen.getByRole('button', { name: 'Singkat dan tajam' }))
  await user.click(screen.getByRole('button', { name: 'Generate demo' }))

  expect(onRequestAuth).toHaveBeenCalledWith('login')
  expect(generateDemo).not.toHaveBeenCalled()
})
