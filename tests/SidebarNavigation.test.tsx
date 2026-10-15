import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { Sidebar } from '../src/components/Sidebar'

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

test('keeps theme selection in Settings and places Settings after Payments', () => {
  const onNavigate = vi.fn()
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
      onNavigate={onNavigate}
      currentUser={{ id: 'admin-1', role: 'admin' }}
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

  const payments = screen.getByRole('button', { name: 'AI Credits' })
    const settings = screen.getByRole('button', { name: 'Settings' })

  expect(payments.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  const adminShortcut = screen.getByRole('button', { name: 'Admin Dashboard' })
  expect(screen.getByRole('combobox', { name: 'Bahasa' }).compareDocumentPosition(adminShortcut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(adminShortcut)
  expect(onNavigate).toHaveBeenCalledWith('admin')
})

test('shows current AI credit usage against the active plan allowance', async () => {
  localStorage.setItem('alurin.authToken', 'usage-token')
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const pathname = new URL(input.toString()).pathname
    if (pathname === '/api/usage/me') {
      return new Response(JSON.stringify({ data: { data: { credits: {
        total: 98,
        subscription: 80,
        topUp: 18,
        usedThisMonth: 12,
        nearestTopUpExpiration: null,
      } } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (pathname === '/api/subscriptions/me') {
      return new Response(JSON.stringify({ data: { planKey: 'pro', planName: 'Pro' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (pathname === '/api/subscription-plans') {
      return new Response(JSON.stringify({ data: [{ id: 'pro', code: 'pro', name: 'Pro', monthlyAiCredits: 1200 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(null, { status: 404 })
  }))

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

  expect(await screen.findByText('AI Credit Usage')).toBeInTheDocument()
  expect(await screen.findByText('12 / 1.200')).toBeInTheDocument()
})
