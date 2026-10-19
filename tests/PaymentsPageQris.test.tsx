import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PaymentsPage } from '../src/pages/PaymentsPage'
import { createPaymentOrder, getPaymentOrderStatus, getPaymentPage } from '../src/services/payments'

vi.mock('../src/services/payments', () => ({
  getPaymentPage: vi.fn(),
  createPaymentOrder: vi.fn(),
  getPaymentOrderStatus: vi.fn(),
}))

vi.mock('../src/components/useToast', () => ({
  useToast: () => ({ info: vi.fn(), error: vi.fn() }),
}))

describe('PaymentsPage QRIS checkout', () => {
  beforeEach(() => {
    vi.mocked(getPaymentPage).mockResolvedValue({
      packages: [{ id: 'plus-id', code: 'plus', name: 'Top Up Plus', token_amount: 1000, price_idr: 99000 }],
      balance: 20,
      subscriptionBalance: 20,
      topUpBalance: 0,
      orders: [],
      notifications: [],
      ledger: [],
      usageHistory: [],
    })
    vi.mocked(createPaymentOrder).mockResolvedValue({
      id: 'order-1',
      message: 'Order dibuat',
      checkoutAvailable: true,
      checkoutUrl: 'https://payments.example/order-1',
      qrImageUrl: 'https://payments.example/order-1.png',
      expiresAt: '2026-10-19T12:00:00.000Z',
    })
    vi.mocked(getPaymentOrderStatus).mockResolvedValue({ status: 'pending' })
  })

  it('shows the order QRIS instead of navigating away after top-up checkout', async () => {
    render(<PaymentsPage onBackToCredits={() => undefined} />)

    await userEvent.click(await screen.findByRole('button', { name: /Lanjut Pembayaran/i }))

    const checkout = await screen.findByRole('dialog', { name: 'Pembayaran QRIS' })
    expect(screen.getByRole('img', { name: 'QRIS untuk Top Up Plus' })).toHaveAttribute(
      'src',
      'https://payments.example/order-1.png',
    )
    expect(checkout).toHaveTextContent('1.000 AI Credits')
  })
})
