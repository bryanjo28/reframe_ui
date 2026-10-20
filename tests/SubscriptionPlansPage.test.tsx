import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SubscriptionPlansPage } from '../src/pages/SubscriptionPlansPage'
import { getCurrentSubscription, listSubscriptionPlans } from '../src/services/subscriptionPlans'
import { createPaymentOrder, getPaymentOrderStatus, getPaymentPage } from '../src/services/payments'

vi.mock('../src/services/subscriptionPlans', () => ({
  getCurrentSubscription: vi.fn(),
  listSubscriptionPlans: vi.fn(),
}))

vi.mock('../src/services/payments', () => ({
  getPaymentPage: vi.fn(),
  createPaymentOrder: vi.fn(),
  getPaymentOrderStatus: vi.fn(),
}))

describe('SubscriptionPlansPage', () => {
  it('opens history when the subscription order is saved without checkout', async () => {
    const onOpenPayments = vi.fn()
    vi.mocked(createPaymentOrder).mockResolvedValueOnce({ id: 'saved-plan', status: 'pending', credits: 600, amount_idr: 59000, payment_method: 'qris', checkoutAvailable: false, checkoutUrl: null })
    render(<SubscriptionPlansPage userId="user-1" onOpenPayments={onOpenPayments} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Buy Creator' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bayar sekarang' }))
    expect(onOpenPayments).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it.each(['Tutup pembayaran', 'Bayar nanti'])('opens history after subscription checkout: %s', async (action) => {
    const onOpenPayments = vi.fn()
    render(<SubscriptionPlansPage userId="user-1" onOpenPayments={onOpenPayments} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Buy Creator' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bayar sekarang' }))
    await screen.findByRole('dialog', { name: 'Pembayaran BNI Virtual Account' })
    await userEvent.click(screen.getByRole('button', { name: action }))
    expect(onOpenPayments).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  beforeEach(() => {
    vi.mocked(getCurrentSubscription).mockResolvedValue(null)
    vi.mocked(listSubscriptionPlans).mockResolvedValue([
      {
        id: 'creator-plan',
        key: 'creator',
        name: 'Creator',
        description: 'Paket aktif yang siap dipakai untuk workspace Anda.',
        price: 59000,
        currency: 'IDR',
        interval: 'monthly',
        status: 'active',
        active: true,
        featured: true,
        monthlyAiCredits: 600,
        raw: {
          max_personas: 10,
          max_content_pillars: 5,
          monthly_ai_credits: 600,
          token_allowance: 3000000,
          max_threads_accounts: 1,
          can_schedule: true,
        },
      },
    ])
    vi.mocked(getPaymentPage).mockResolvedValue({
      packages: [], balance: 0, subscriptionBalance: 0, topUpBalance: 0,
      orders: [], notifications: [], ledger: [], usageHistory: [], paymentMethods: ['qris', 'bni_va'],
    })
    vi.mocked(createPaymentOrder).mockResolvedValue({
      id: 'plan-order', message: 'Order dibuat', status: 'pending', credits: 600,
      amount_idr: 59000, payment_method: 'bni_va', checkoutAvailable: true, checkoutUrl: null,
      payment: { va_number: '880812345678', total_payment: 60500, expired_at: '2026-10-19T12:00:00.000Z', qr_string: null },
    })
    vi.mocked(getPaymentOrderStatus).mockResolvedValue({ status: 'pending' })
  })

  it('shows a concise recommended plan card without repeated plan copy', async () => {
    render(<SubscriptionPlansPage userId="user-1" />)

    const recommendation = await screen.findByText('Paling direkomendasikan')
    expect(recommendation.parentElement).toHaveClass('subscription-card', 'recommended')
    expect(recommendation.closest('.subscription-card-head')).toBeNull()
    expect(screen.getByText('10 Persona')).toBeInTheDocument()
    expect(screen.getByText('5 Content Pillar')).toBeInTheDocument()
    expect(screen.getByText('600 AI Credits/bulan')).toBeInTheDocument()
    expect(screen.getByText('1 akun Threads')).toBeInTheDocument()
    expect(screen.getByText('Schedule Post')).toBeInTheDocument()
    expect(screen.queryByText('Token allowance:', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('Paket aktif yang siap dipakai untuk workspace Anda.')).not.toBeInTheDocument()
    expect(screen.queryByText('Available')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate Topic, Content, dan Regenerate AI')).not.toBeInTheDocument()
  })

  it('creates a plan order after the user selects a payment method', async () => {
    render(<SubscriptionPlansPage userId="user-1" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Buy Creator' }))
    await userEvent.click(screen.getByRole('radio', { name: /BNI Virtual Account/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Bayar sekarang' }))

    expect(createPaymentOrder).toHaveBeenCalledWith({ planId: 'creator-plan', method: 'bni_va' })
    const checkout = await screen.findByRole('dialog', { name: 'Pembayaran BNI Virtual Account' })
    expect(checkout).toBeInTheDocument()
    expect(within(checkout).getByText(/Rp\s*60\.500/)).toBeInTheDocument()
    expect(within(checkout).getByText('600 AI Credits per bulan')).toBeInTheDocument()
  })
})
