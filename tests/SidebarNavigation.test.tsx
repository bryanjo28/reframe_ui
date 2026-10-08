import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { Sidebar } from '../src/components/Sidebar'

test('keeps theme selection in Settings and places Settings after Payments', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
  )

  render(
    <Sidebar
      activePage="dashboard"
      onNavigate={vi.fn()}
      currentUser={null}
      onLogout={vi.fn()}
      isCollapsed={false}
      isMobile={false}
      isOpen
      onToggleCollapse={vi.fn()}
      onClose={vi.fn()}
      onReplayTutorial={vi.fn()}
      language="id"
      onLanguageChange={vi.fn()}
    />,
  )

  expect(screen.queryByRole('button', { name: 'Toggle light mode' })).not.toBeInTheDocument()

  const payments = screen.getByRole('button', { name: 'Pembayaran' })
    const settings = screen.getByRole('button', { name: 'Settings' })

  expect(payments.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
