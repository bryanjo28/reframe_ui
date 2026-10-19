import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PaymentsPage } from '../src/pages/PaymentsPage'
import { TopUpCreditsPage } from '../src/pages/TopUpCreditsPage'
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
      paymentMethods: ['qris', 'bni_va'],
    })
    vi.mocked(createPaymentOrder).mockResolvedValue({
      id: 'order-1',
      message: 'Order dibuat',
      checkoutAvailable: true,
      checkoutUrl: 'https://payments.example/order-1',
      qrImageUrl: 'https://payments.example/order-1.png',
      expiresAt: '2026-10-19T12:00:00.000Z',
      payment_method: 'qris',
      payment: {
        va_number: null,
        total_payment: 100500,
        expired_at: '2026-10-19T12:00:00.000Z',
        qr_string: '00020101021226670016COM.NOBUBANK.WWW',
      },
    })
    vi.mocked(getPaymentOrderStatus).mockResolvedValue({ status: 'pending' })
  })

  it('shows the order QRIS instead of navigating away after top-up checkout', async () => {
    render(<TopUpCreditsPage onBackToCredits={() => undefined} />)

    await userEvent.click(await screen.findByRole('button', { name: /Lanjut Pembayaran/i }))

    const checkout = await screen.findByRole('dialog', { name: 'Pembayaran QRIS' })
    expect(screen.getByRole('img', { name: 'QRIS untuk Top Up Plus' })).toHaveAttribute(
      'src',
      'https://payments.example/order-1.png',
    )
    expect(checkout).toHaveTextContent('1.000 AI Credits')
  })

  it('lets the user choose a backend-provided VA method before paying', async () => {
    render(<TopUpCreditsPage onBackToCredits={() => undefined} />)

    await userEvent.click(await screen.findByRole('radio', { name: /BNI Virtual Account/i }))
    await userEvent.click(screen.getByRole('button', { name: /Lanjut Pembayaran/i }))

    expect(createPaymentOrder).toHaveBeenCalledWith({ packageId: 'plus-id', method: 'bni_va' })
  })

  it('filters payment history across every supported order status', async () => {
    vi.mocked(getPaymentPage).mockResolvedValue({
      packages: [{ id: 'plus-id', code: 'plus', name: 'Top Up Plus', token_amount: 1000, price_idr: 99000 }],
      balance: 20,
      subscriptionBalance: 20,
      topUpBalance: 0,
      orders: [
        { id: 'pending-1', status: 'pending', amount_idr: 29000, token_amount: 100, provider: 'pakasir', created_at: '2026-10-19T10:00:00Z', paid_at: null, product_name: 'Pending Pack' },
        { id: 'paid-1', status: 'paid', amount_idr: 59000, token_amount: 300, provider: 'pakasir', created_at: '2026-10-18T10:00:00Z', paid_at: '2026-10-18T10:05:00Z', product_name: 'Paid Pack' },
        { id: 'failed-1', status: 'failed', amount_idr: 29000, token_amount: 100, provider: 'pakasir', created_at: '2026-10-17T10:00:00Z', paid_at: null, product_name: 'Failed Pack' },
        { id: 'expired-1', status: 'expired', amount_idr: 29000, token_amount: 100, provider: 'pakasir', created_at: '2026-10-16T10:00:00Z', paid_at: null, product_name: 'Expired Pack' },
        { id: 'cancelled-1', status: 'cancelled', amount_idr: 29000, token_amount: 100, provider: 'pakasir', created_at: '2026-10-15T10:00:00Z', paid_at: null, product_name: 'Cancelled Pack' },
        { id: 'refunded-1', status: 'refunded', amount_idr: 59000, token_amount: 300, provider: 'pakasir', created_at: '2026-10-14T10:00:00Z', paid_at: null, product_name: 'Refunded Pack' },
      ],
      notifications: [], ledger: [], usageHistory: [], paymentMethods: ['qris'],
    })

    render(<PaymentsPage onBackToCredits={() => undefined} />)

    const history = await screen.findByRole('region', { name: 'Riwayat pembayaran' })
    expect(screen.queryByRole('radiogroup', { name: 'Paket top up AI Credits' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Metode pembayaran' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lanjut Pembayaran/i })).not.toBeInTheDocument()
    for (const label of ['Semua', 'Pending', 'Berhasil', 'Gagal', 'Kedaluwarsa', 'Dibatalkan', 'Refund']) {
      expect(within(history).getByRole('button', { name: label })).toBeInTheDocument()
    }

    await userEvent.click(within(history).getByRole('button', { name: 'Berhasil' }))
    expect(within(history).getByText('Paid Pack')).toBeInTheDocument()
    expect(within(history).queryByText('Pending Pack')).not.toBeInTheDocument()

    await userEvent.click(within(history).getByRole('button', { name: 'Refund' }))
    expect(within(history).getByText('Refunded Pack')).toBeInTheDocument()
    expect(within(history).queryByText('Paid Pack')).not.toBeInTheDocument()
  })

  it('refreshes a pending order status from the server', async () => {
    const pendingOrder = { id: 'pending-1', status: 'pending', amount_idr: 29000, token_amount: 100, provider: 'pakasir', created_at: '2026-10-19T10:00:00Z', paid_at: null, product_name: 'Pending Pack' }
    const baseData = {
      packages: [{ id: 'plus-id', code: 'plus', name: 'Top Up Plus', token_amount: 1000, price_idr: 99000 }],
      balance: 20, subscriptionBalance: 20, topUpBalance: 0,
      notifications: [], ledger: [], usageHistory: [], paymentMethods: ['qris'],
    }
    vi.mocked(getPaymentPage)
      .mockResolvedValueOnce({ ...baseData, orders: [pendingOrder] })
      .mockResolvedValueOnce({ ...baseData, orders: [{ ...pendingOrder, status: 'paid', paid_at: '2026-10-19T10:05:00Z' }] })
    vi.mocked(getPaymentOrderStatus).mockResolvedValueOnce({ status: 'paid' })

    render(<PaymentsPage onBackToCredits={() => undefined} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Cek status Pending Pack' }))

    expect(getPaymentOrderStatus).toHaveBeenCalledWith('pending-1')
    await waitFor(() => expect(getPaymentPage).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Berhasil', { selector: '.payment-order-status' })).toBeInTheDocument()
  })
})
