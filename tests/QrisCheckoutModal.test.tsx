import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { QrisCheckoutModal } from '../src/components/QrisCheckoutModal'

describe('QrisCheckoutModal', () => {
  it('hides expired payment instructions even while the server status is pending', () => {
    render(<QrisCheckoutModal open title="Expired order" description="Credits" amount={29000}
      qrImageUrl="https://payments.example/expired.png" checkoutUrl="https://payments.example/old"
      expiresAt="2000-01-01T00:00:00Z" initialStatus="pending" onClose={vi.fn()} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buka halaman pembayaran' })).not.toBeInTheDocument()
    expect(screen.queryByText('Waktu pembayaran')).not.toBeInTheDocument()
    expect(screen.queryByText('Buka aplikasi bank atau e-wallet.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detail transaksi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutup', exact: true })).toBeInTheDocument()
  })

  it('hides a QR as its expiry passes while still accepting a later paid response', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'))
    const checkStatus = vi.fn().mockResolvedValue({ status: 'paid' })
    const onPaid = vi.fn()
    render(<QrisCheckoutModal open title="Order" description="Credits" amount={29000}
      orderId="order-1" qrImageUrl="https://payments.example/qr.png"
      checkoutUrl="https://payments.example/pay" expiresAt="2026-10-20T10:00:01Z"
      checkStatus={checkStatus} onPaid={onPaid} onClose={vi.fn()} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
    expect(onPaid).toHaveBeenCalledWith('order-1')
    expect(screen.getByText('Pembayaran berhasil')).toBeInTheDocument()
  })
  it('keeps checking after countdown zero until server cancellation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'))
    const checkStatus = vi.fn().mockResolvedValueOnce({ status: 'pending' }).mockResolvedValue({ status: 'cancelled' })
    render(<QrisCheckoutModal open title="Order" description="Credits" amount={29000} orderId="order-1" expiresAt="2026-10-20T10:00:01Z" checkStatus={checkStatus} onClose={() => undefined} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByText(/Waktu pembayaran habis/)).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByText('Dibatalkan')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(checkStatus).toHaveBeenCalledTimes(2)
  })
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

  it('renders payment.qr_string locally as a QR image', async () => {
    render(
      <QrisCheckoutModal
        open
        title="Top Up Plus"
        description="1.000 AI Credits"
        amount={99000}
        paymentMethod="qris"
        qrString="00020101021226670016COM.NOBUBANK.WWW"
        onClose={() => undefined}
      />,
    )

    expect(await screen.findByRole('img', { name: 'QRIS untuk Top Up Plus' })).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/png;base64,/),
    )
  })

  it('shows the VA number and final backend total for virtual-account payments', () => {
    render(
      <QrisCheckoutModal
        open
        title="Creator"
        description="600 AI Credits per bulan"
        amount={59000}
        totalPayment={60500}
        paymentMethod="bni_va"
        vaNumber="880812345678"
        onClose={() => undefined}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Pembayaran BNI Virtual Account' })).toBeInTheDocument()
    expect(screen.getByText('880812345678')).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*60\.500/)).toBeInTheDocument()
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
    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(checkStatus).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(onPaid).toHaveBeenCalledWith('order-1')
  })
})
