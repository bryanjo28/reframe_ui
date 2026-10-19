import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { QrisCheckoutModal } from '../src/components/QrisCheckoutModal'

describe('QrisCheckoutModal', () => {
  afterEach(() => vi.useRealTimers())
  it('shows the selected purchase and a safe checkout fallback when a QR image is unavailable', async () => {
    const onClose = vi.fn()
    render(
      <QrisCheckoutModal
        open
        title="Creator"
        description="600 AI Credits per bulan"
        amount={59000}
        checkoutUrl="https://payments.example/creator"
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Pembayaran QRIS' })).toBeInTheDocument()
    expect(screen.getByText('Creator')).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*59\.000/)).toBeInTheDocument()
    expect(screen.getByText('QRIS akan muncul di sini')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buka halaman pembayaran' })).toHaveAttribute(
      'href',
      'https://payments.example/creator',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Tutup pembayaran' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the QR image returned by the payment backend', () => {
    render(
      <QrisCheckoutModal
        open
        title="Top Up Plus"
        description="1.000 AI Credits"
        amount={99000}
        qrImageUrl="https://payments.example/qris.png"
        onClose={() => undefined}
      />,
    )

    expect(screen.getByRole('img', { name: 'QRIS untuk Top Up Plus' })).toHaveAttribute(
      'src',
      'https://payments.example/qris.png',
    )
  })

  it('shows the backend expiry countdown and completes when polling returns paid', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-19T10:00:00.000Z'))
    const checkStatus = vi.fn().mockResolvedValue({ status: 'paid' as const })
    const onPaid = vi.fn()

    render(
      <QrisCheckoutModal
        open
        title="Starter"
        description="200 AI Credits per bulan"
        amount={29000}
        orderId="order-1"
        expiresAt="2026-10-19T10:15:00.000Z"
        checkStatus={checkStatus}
        onPaid={onPaid}
        onClose={() => undefined}
      />,
    )

    expect(screen.getByText('15:00')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(onPaid).toHaveBeenCalledWith('order-1')
  })
})
