import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiCreditsPage } from '../src/pages/AiCreditsPage'
import { NotificationBell } from '../src/components/NotificationBell'
import { getPaymentPage, markPaymentNotificationRead } from '../src/services/payments'
import { getNotifications } from '../src/services/payments'
import { USAGE_UPDATED_EVENT } from '../src/services/usage'

vi.mock('../src/services/payments', () => ({
  getPaymentPage: vi.fn(),
  getNotifications: vi.fn(),
  markPaymentNotificationRead: vi.fn(),
}))

describe('AiCreditsPage', () => {
  it('updates the unread badge after generation completes without remounting', async () => {
    vi.mocked(getNotifications).mockResolvedValueOnce([]).mockResolvedValue([{
      id: 'new-notification', type: 'topic_success', title: 'Hasil generate topic', message: '1 topic berhasil dibuat.', read_at: null, created_at: '2026-10-14T09:00:00Z',
    }])
    render(<NotificationBell />)
    await waitFor(() => expect(getNotifications).toHaveBeenCalled())
    fireEvent(window, new Event(USAGE_UPDATED_EVENT))
    expect(await screen.findByRole('button', { name: 'Notifikasi (1 belum dibaca)' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi (1 belum dibaca)' }))
    expect(await screen.findByText('Hasil generate topic')).toBeInTheDocument()
  })
  beforeEach(() => {
    vi.mocked(markPaymentNotificationRead).mockResolvedValue(undefined)
    vi.mocked(getPaymentPage).mockResolvedValue({
      packages: [],
      balance: 98,
      subscriptionBalance: 80,
      topUpBalance: 18,
      orders: [{
        id: 'order-1', amount_idr: 29000, token_amount: 200, status: 'paid', provider: 'qris',
        created_at: '2026-10-14T08:00:00.000Z', paid_at: '2026-10-14T08:05:00.000Z',
        product_name: 'Starter', product_type: 'subscription',
      }],
      notifications: [{
        id: 'notification-1',
        type: 'payment_success',
        title: 'Top up berhasil',
        message: '18 AI Credits sudah masuk.',
        read_at: null,
        created_at: '2026-10-14T08:00:00.000Z',
      }],
      ledger: [{
        id: 'ledger-1',
        credits_delta: 18,
        balance_after: 98,
        transaction_type: 'top_up',
        source_type: 'payment',
        created_at: '2026-10-14T08:00:00.000Z',
      }],
      usageHistory: [{
        request_id: 'request-1',
        feature: 'generate_topic',
        total_tokens: 1500,
        credits_charged: 2,
        status: 'success',
        created_at: '2026-10-14T09:00:00.000Z',
      }],
    })
  })

  it('opens notifications from a bell and marks an item as read', async () => {
    vi.mocked(getNotifications).mockResolvedValue((await getPaymentPage()).notifications)
    render(<NotificationBell />)

    const bell = await screen.findByRole('button', { name: 'Notifikasi (1 belum dibaca)' })
    expect(screen.queryByText('Top up berhasil')).not.toBeInTheDocument()

    fireEvent.click(bell)
    fireEvent.click(screen.getByRole('button', { name: /Top up berhasil/i }))

    await waitFor(() => expect(markPaymentNotificationRead).toHaveBeenCalledWith('notification-1'))
    expect(screen.getByRole('button', { name: 'Notifikasi' })).toBeInTheDocument()
  })

  it('places credit and usage histories in the same two-column row', async () => {
    render(<AiCreditsPage onTopUp={vi.fn()} onViewPlans={vi.fn()} />)

    const creditHistory = await screen.findByRole('heading', { name: 'Riwayat credits' })
    const usageHistory = screen.getByRole('heading', { name: 'Usage History' })
    expect(creditHistory.closest('.ai-credits-history-grid')).toBe(usageHistory.closest('.ai-credits-history-grid'))
    expect(screen.getByText('top up')).toBeInTheDocument()
    expect(screen.getByText('-2 credits')).toBeInTheDocument()
  })

  it('keeps payment orders out of the AI Credits page', async () => {
    render(<AiCreditsPage onTopUp={vi.fn()} onViewPlans={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Riwayat credits' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Ringkasan order terbaru' })).not.toBeInTheDocument()
    expect(screen.queryByText('Starter')).not.toBeInTheDocument()
  })
})
