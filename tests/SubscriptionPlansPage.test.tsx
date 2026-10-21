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
    render(<SubscriptionPlansPage userId="user-1" onOpenPayments={onOpenPayments} language="en" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Buy Creator' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))
    expect(onOpenPayments).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it.each(['Tutup pembayaran', 'Bayar nanti'])('opens history after subscription checkout: %s', async (action) => {
    const onOpenPayments = vi.fn()
    render(<SubscriptionPlansPage userId="user-1" onOpenPayments={onOpenPayments} language="en" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Buy Creator' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await screen.findByRole('dialog', { name: 'Pembayaran BNI Virtual Account' })
    await userEvent.click(screen.getByRole('button', { name: action }))
    expect(onOpenPayments).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  beforeEach(() => {
    vi.mocked(getCurrentSubscription).mockResolvedValue(null)
    vi.mocked(listSubscriptionPlans).mockResolvedValue([
      {
        id: 'free-plan', key: 'free', name: 'Free', description: '', price: 0, currency: 'IDR', interval: 'monthly', status: 'active', active: true, featured: false, monthlyAiCredits: 6,
        raw: { max_personas: 1, content_pillars: 1, monthly_ai_credits: 6, max_threads_accounts: 0, can_schedule: false },
      },
      {
        id: 'starter-plan', key: 'starter', name: 'Starter', description: '', price: 29000, currency: 'IDR', interval: 'monthly', status: 'active', active: true, featured: false, monthlyAiCredits: 200,
        raw: { max_personas: 2, content_pillars: 3, monthly_ai_credits: 200, max_threads_accounts: 1, can_schedule: true, defaultDurationMonths: 3, enabledDurations: [1, 3, 12], pricing: { prices: { '1': 29000, '3': 74000, '12': 249000 } } },
      },
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
          max_personas: 5,
          content_pillars: 10,
          monthly_ai_credits: 600,
          max_threads_accounts: 1,
          can_schedule: true,
          defaultDurationMonths: 3,
          enabledDurations: [1, 3, 12],
          pricing: { prices: { '1': 59000, '3': 149000, '12': 499000 } },
          token_allowance: 3000000,
        },
      },
      {
        id: 'pro-plan', key: 'pro', name: 'Pro', description: '', price: 99000, currency: 'IDR', interval: 'monthly', status: 'active', active: true, featured: false, monthlyAiCredits: 1200,
        raw: { max_personas: 10, content_pillars: 20, monthly_ai_credits: 1200, max_threads_accounts: 1, can_schedule: true, defaultDurationMonths: 3, enabledDurations: [1, 3, 12], pricing: { prices: { '1': 99000, '3': 249000, '12': 839000 } } },
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
    expect(screen.getByText('5 Persona')).toBeInTheDocument()
    expect(screen.getByText('10 Content Pillar')).toBeInTheDocument()
    expect(screen.getByText('600 AI Credits/bulan')).toBeInTheDocument()
    expect(screen.getAllByText('Connect 1 akun Threads')).toHaveLength(3)
    expect(screen.getAllByText('Schedule Post')).toHaveLength(3)
    expect(screen.getAllByText('Generate Topik & Konten')).toHaveLength(4)
    expect(screen.queryByText('Token allowance:', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('Paket aktif yang siap dipakai untuk workspace Anda.')).not.toBeInTheDocument()
    expect(screen.queryByText('Available')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate Topic, Content, dan Regenerate AI')).not.toBeInTheDocument()
  })

  it('shows free credits and unavailable features as excluded plan limits', async () => {
    render(<SubscriptionPlansPage userId="user-1" />)

    const freeCard = (await screen.findByRole('heading', { name: 'Free' })).closest('article')
    expect(freeCard).not.toBeNull()
    expect(within(freeCard!).getByText('6 AI Credits sekali daftar')).toBeInTheDocument()
    expect(within(freeCard!).getByText('1 Persona')).toBeInTheDocument()
    expect(within(freeCard!).getByText('1 Content Pillar')).toBeInTheDocument()
    expect(within(freeCard!).getByText('Tanpa Connect Threads').closest('li')).toHaveClass('unavailable')
    expect(within(freeCard!).getByText('Tanpa Schedule Post').closest('li')).toHaveClass('unavailable')
  })

  it('never displays the default plan price as the 3- or 12-month total when duration pricing is missing', async () => {
    vi.mocked(listSubscriptionPlans).mockResolvedValueOnce([
      {
        id: 'free-plan', key: 'free', name: 'Free', description: '', price: 0, currency: 'IDR', interval: 'monthly', status: 'active', active: true, featured: false, monthlyAiCredits: 6,
        raw: { max_personas: 1, content_pillars: 1, monthly_ai_credits: 6, max_threads_accounts: 0, can_schedule: false },
      },
      {
        id: 'starter-plan', key: 'starter', name: 'Starter', description: '', price: 29000, currency: 'IDR', interval: 'monthly', status: 'active', active: true, featured: false, monthlyAiCredits: 200,
        raw: { max_personas: 2, content_pillars: 3, monthly_ai_credits: 200, max_threads_accounts: 1, can_schedule: true, defaultDurationMonths: 3, enabledDurations: [1, 3, 12] },
      },
    ])

    render(<SubscriptionPlansPage userId="user-1" />)

    const starterCard = (await screen.findByRole('heading', { name: 'Starter' })).closest('article')
    expect(starterCard).not.toBeNull()
    expect(within(starterCard!).getAllByText('Harga belum tersedia')).toHaveLength(2)
    expect(within(starterCard!).getByRole('button', { name: 'Harga belum tersedia' })).toBeDisabled()
    expect(within(starterCard!).queryByText('Rp 29.000')).not.toBeInTheDocument()
  })

  it('creates a plan order after the user selects a payment method', async () => {
    render(<SubscriptionPlansPage userId="user-1" language="en" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Buy Creator' }))
    expect(screen.getByRole('region', { name: 'Order summary' })).toHaveTextContent('3 months')
    expect(screen.getByRole('region', { name: 'Order summary' })).toHaveTextContent('Rp 149.000')
    await userEvent.click(screen.getByRole('radio', { name: /Virtual Account/i }))
    await userEvent.click(screen.getByRole('radio', { name: /BNI Virtual Account/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(createPaymentOrder).toHaveBeenCalledWith({ planId: 'creator-plan', method: 'bni_va', durationMonths: 3 })
    const checkout = await screen.findByRole('dialog', { name: 'Pembayaran BNI Virtual Account' })
    expect(checkout).toBeInTheDocument()
    expect(within(checkout).getByText(/Rp\s*60\.500/)).toBeInTheDocument()
    expect(within(checkout).getByText(/600 AI Credits per month/)).toBeInTheDocument()
  })

  it.each([
    ['1 month', 'Rp 59.000'],
    ['3 months', 'Rp 149.000'],
    ['1 Year', 'Rp 499.000'],
  ])('shows the backend price for a %s subscription duration', async (duration, price) => {
    render(<SubscriptionPlansPage userId="user-1" language="en" />)
    await userEvent.click(await screen.findByRole('button', { name: duration }))
    await userEvent.click(screen.getByRole('button', { name: 'Buy Creator' }))

    const summary = screen.getByRole('region', { name: 'Order summary' })
    expect(summary).toHaveTextContent(duration === '1 Year' ? '12 months' : duration)
    expect(summary).toHaveTextContent(price)
  })
})
