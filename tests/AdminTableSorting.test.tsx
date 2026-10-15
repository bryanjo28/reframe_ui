import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminDashboardPage } from '../src/pages/Admin/AdminDashboardPage'

afterEach(() => vi.unstubAllGlobals())

it.each([
  ['users', 'Registered', 'created_at', '2026-01-01', '2026-02-01'],
  ['users', 'Last Login', 'lastLoginAt', '2026-01-01', '2026-02-01'],
  ['ai-usage', 'Est. cost (IDR)', 'estimatedCostIdr', '2', '10'],
  ['scheduled-posts', 'Scheduled', 'scheduledAt', '2026-01-01', '2026-02-01'],
])('sorts %s by %s in both directions with missing values last', async (section, title, key, low, high) => {
  window.history.replaceState({}, '', `/admin/${section}`)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: {
    items: [
      { id: 'low', name: 'Low', user: 'Low', [key]: low },
      { id: 'missing', name: 'Missing', user: 'Missing', [key]: null },
      { id: 'high', name: 'High', user: 'High', [key]: high },
    ], total: 3, page: 1, limit: 25,
  } }), { status: 200 })))
  render(<AdminDashboardPage onBackToUser={vi.fn()} onLogout={vi.fn()} />)
  const button = await screen.findByRole('button', { name: title })
  const names = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((row) => within(row).getByText(/^(High|Low|Missing)$/).textContent)
  fireEvent.click(button)
  expect(names()).toEqual(['High', 'Low', 'Missing'])
  expect(button.closest('th')).toHaveAttribute('aria-sort', 'descending')
  fireEvent.click(button)
  expect(names()).toEqual(['Low', 'High', 'Missing'])
  expect(button.closest('th')).toHaveAttribute('aria-sort', 'ascending')
})

it.each(['ai-usage', 'scheduled-posts'])('sends the selected %s status to the API', async (section) => {
  window.history.replaceState({}, '', `/admin/${section}`)
  const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 25 } }), { status: 200 }))
  vi.stubGlobal('fetch', fetchSpy)
  render(<AdminDashboardPage onBackToUser={vi.fn()} onLogout={vi.fn()} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'failed' } })
  await waitFor(() => expect(fetchSpy.mock.calls.some((args) => new URL(String((args as unknown[])[0])).searchParams.get('status') === 'failed')).toBe(true))
})
