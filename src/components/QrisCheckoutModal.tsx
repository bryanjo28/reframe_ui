import { useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from './AppIcon'

type QrisCheckoutModalProps = {
  open: boolean
  title: string
  description: string
  amount: number
  qrImageUrl?: string | null
  checkoutUrl?: string | null
  expiresAt?: string | null
  orderId?: string | null
  checkStatus?: (orderId: string) => Promise<{ status: string }>
  onPaid?: (orderId: string) => void
  onClose: () => void
}

const money = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value)

export function QrisCheckoutModal({
  open,
  title,
  description,
  amount,
  qrImageUrl,
  checkoutUrl,
  expiresAt,
  orderId,
  checkStatus,
  onPaid,
  onClose,
}: QrisCheckoutModalProps) {
  const expiryTime = useMemo(() => expiresAt ? new Date(expiresAt).getTime() : null, [expiresAt])
  const [secondsLeft, setSecondsLeft] = useState(() => expiryTime ? Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000)) : null)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const paidHandled = useRef(false)

  useEffect(() => {
    if (!open || !expiryTime) return
    const updateCountdown = () => {
      const nextSeconds = Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000))
      setSecondsLeft(nextSeconds)
      if (nextSeconds === 0) setPaymentStatus('expired')
    }
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [expiryTime, open])

  useEffect(() => {
    if (!open || !orderId || !checkStatus || paymentStatus !== 'pending') return
    const poll = async () => {
      try {
        const result = await checkStatus(orderId)
        const nextStatus = result.status.toLowerCase()
        setPaymentStatus(nextStatus)
        if (['paid', 'settlement', 'capture', 'success'].includes(nextStatus) && !paidHandled.current) {
          paidHandled.current = true
          onPaid?.(orderId)
        }
      } catch {
        // Keep the checkout active when one status request fails.
      }
    }
    const timer = window.setInterval(() => { void poll() }, 3000)
    return () => window.clearInterval(timer)
  }, [checkStatus, onPaid, open, orderId, paymentStatus])
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="qris-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="qris-modal" role="dialog" aria-modal="true" aria-label="Pembayaran QRIS">
        <header className="qris-modal-header">
          <div><p className="eyebrow">Pembayaran QRIS</p><h2>Scan untuk menyelesaikan pembayaran</h2></div>
          <button type="button" aria-label="Tutup pembayaran" onClick={onClose}><AppIcon name="close" /></button>
        </header>

        <div className="qris-modal-body">
          <div className="qris-code-panel">
            <div className={`qris-code${qrImageUrl ? '' : ' is-placeholder'}`}>
              {qrImageUrl
                ? <img src={qrImageUrl} alt={`QRIS untuk ${title}`} />
                : <><div className="qris-placeholder-mark" aria-hidden="true"><span /><span /><span /></div><strong>QRIS akan muncul di sini</strong><small>Menunggu data QR dari payment gateway</small></>}
            </div>
            <span className={`qris-status ${paymentStatus}`}><i /> {paymentStatus === 'expired' ? 'QRIS kedaluwarsa' : paymentStatus === 'paid' ? 'Pembayaran berhasil' : 'Menunggu pembayaran'}</span>
            {secondsLeft !== null ? <div className="qris-countdown"><small>Waktu pembayaran</small><strong>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</strong></div> : null}
          </div>

          <div className="qris-order-panel">
            <div><p className="eyebrow">Ringkasan order</p><h3>{title}</h3><p>{description}</p></div>
            <dl><div><dt>Total pembayaran</dt><dd>{money(amount)}</dd></div><div><dt>Metode</dt><dd>QRIS</dd></div></dl>
            <ol className="qris-instructions">
              <li>Buka aplikasi bank atau e-wallet.</li>
              <li>Pilih menu scan QRIS dan arahkan ke kode.</li>
              <li>Konfirmasi nominal, lalu selesaikan pembayaran.</li>
            </ol>
            {checkoutUrl ? <a className="primary-button qris-checkout-link" href={checkoutUrl}>Buka halaman pembayaran</a> : <p className="qris-preview-note"><AppIcon name="info" /> Preview FE—checkout QRIS akan aktif setelah endpoint pembayaran tersedia.</p>}
            <button className="ghost-button qris-close-action" type="button" onClick={onClose}>Bayar nanti</button>
          </div>
        </div>
      </section>
    </div>
  )
}
