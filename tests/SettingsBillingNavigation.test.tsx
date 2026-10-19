import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { SettingsPage } from '../src/pages/SettingsPage'

test('groups subscriptions with AI Credits and exposes payments separately', () => {
  const onNavigate = vi.fn()

  render(
    <SettingsPage
      user={null}
      language="id"
      onLanguageChange={vi.fn()}
      theme="dark"
      onThemeChange={vi.fn()}
      onReplayTutorial={vi.fn()}
      onLogout={vi.fn()}
      onNavigate={onNavigate}
    />,
  )

  expect(screen.queryByRole('button', { name: /^Langganan$/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^AI Credits$/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Langganan & AI Credits/i }))
  expect(onNavigate).toHaveBeenLastCalledWith('ai-credits')

  fireEvent.click(screen.getByRole('button', { name: /Pembayaran/i }))
  expect(onNavigate).toHaveBeenLastCalledWith('payments')
})
