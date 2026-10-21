import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { AppIcon } from './AppIcon'
import { paymentMethodLabel } from '../utils/paymentMethods'

type QrisCheckoutModalProps = {
  open: boolean; title: string; description: string; amount: number
  totalPayment?: number | null; paymentMethod?: string; qrString?: string | null; vaNumber?: string | null
  qrImageUrl?: string | null; checkoutUrl?: string | null; expiresAt?: string | null; orderId?: string | null
  initialStatus?: string; onStatusChange?: (status: string) => void
  checkStatus?: (orderId: string) => Promise<{ status: string }>; onPaid?: (orderId: string) => void; onClose: () => void
}

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export function QrisCheckoutModal({ open, title, description, amount, totalPayment, paymentMethod = 'qris', qrString, vaNumber, qrImageUrl, checkoutUrl, expiresAt, orderId, checkStatus, onPaid, onClose, initialStatus = 'pending', onStatusChange }: QrisCheckoutModalProps) {
  const isQris = paymentMethod === 'qris'
  const methodLabel = paymentMethodLabel(paymentMethod)
  const expiryTime = useMemo(() => expiresAt ? new Date(expiresAt).getTime() : null, [expiresAt])
  const [secondsLeft, setSecondsLeft] = useState(() => expiryTime ? Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000)) : null)
  const [paymentStatus, setPaymentStatus] = useState(initialStatus.toLowerCase())
  const [generatedQrImage, setGeneratedQrImage] = useState<{ source: string; url: string } | null>(null)
  const paidHandled = useRef(false)

  useEffect(() => {
    let active = true
    if (open && isQris && qrString) void QRCode.toDataURL(qrString, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => { if (active) setGeneratedQrImage({ source: qrString, url }) })
      .catch(() => { if (active) setGeneratedQrImage(null) })
    return () => { active = false }
  }, [isQris, open, qrString])

  useEffect(() => {
    if (!open || !expiryTime) return
    const updateCountdown = () => {
      const nextSeconds = Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000))
      setSecondsLeft(nextSeconds)

    }
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [expiryTime, open])

  useEffect(() => {
    if (!open || !orderId || !checkStatus || paymentStatus !== 'pending') return
    let active = true
    let checking = false
    const poll = async () => {
      if (!active || checking) return
      checking = true
      try {
        const result = await checkStatus(orderId)
        if (!active) return
        const nextStatus = result.status.toLowerCase()
        setPaymentStatus(nextStatus)
        onStatusChange?.(nextStatus)
        if (nextStatus === 'paid' && !paidHandled.current) { paidHandled.current = true; onPaid?.(orderId) }
      } catch { /* Retry transient failures. */ } finally { checking = false }
    }
    const timer = window.setInterval(() => { void poll() }, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [checkStatus, onPaid, onStatusChange, open, orderId, paymentStatus])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null
  const qrImage = generatedQrImage && generatedQrImage.source === qrString ? generatedQrImage.url : qrImageUrl
  const pending = paymentStatus === 'pending'
  const canPay = pending && secondsLeft !== 0
  const statusCopy = ({paid: 'Pembayaran berhasil', cancelled: 'Dibatalkan', expired: 'Waktu pembayaran habis', failed: 'Pembayaran gagal', refunded: 'Pembayaran dikembalikan'} as Record<string, string>)[paymentStatus] || (secondsLeft === 0 ? 'Waktu pembayaran habis. Sudah membayar? Cek status terlebih dahulu.' : 'Menunggu pembayaran')

  return <div className="qris-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`qris-modal${canPay ? '' : ' qris-modal-detail'}`} role="dialog" aria-modal="true" aria-label={`Pembayaran ${methodLabel}`}>
      <header className="qris-modal-header">
        <div><p className="eyebrow">Pembayaran {methodLabel}</p><h2>{!canPay ? 'Detail transaksi' : isQris ? 'Scan untuk menyelesaikan pembayaran' : 'Selesaikan pembayaran melalui virtual account'}</h2></div>
        <button type="button" aria-label="Tutup pembayaran" onClick={onClose}><AppIcon name="close" /></button>
      </header>
      <div className="qris-modal-body">
        <div className="qris-code-panel">
          {canPay && (isQris ? <div className={`qris-code${qrImage ? '' : ' is-placeholder'}`}>
            {qrImage ? <img src={qrImage} alt={`QRIS untuk ${title}`} /> : <><div className="qris-placeholder-mark" aria-hidden="true"><span /><span /><span /></div><strong>QRIS akan muncul di sini</strong><small>Menunggu data QR dari payment gateway</small></>}
          </div> : <div className="va-number-card"><span>Nomor {methodLabel}</span><strong>{vaNumber || '-'}</strong><button type="button" disabled={!vaNumber} onClick={() => { if (vaNumber) void navigator.clipboard?.writeText(vaNumber) }}>Salin nomor VA</button></div>)}
          <span className={`qris-status ${paymentStatus}`}><i /> {statusCopy}</span>
          {canPay && secondsLeft !== null ? <div className="qris-countdown"><small>Waktu pembayaran</small><strong>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</strong></div> : null}
        </div>
        <div className="qris-order-panel">
          <div><p className="eyebrow">Ringkasan order</p><h3>{title}</h3><p>{description}</p></div>
          <dl>{orderId ? <div><dt>ID transaksi</dt><dd>{orderId}</dd></div> : null}<div><dt>Metode</dt><dd>{methodLabel}</dd></div></dl>
          {canPay ? <ol className="qris-instructions">{isQris ? <><li>Buka aplikasi bank atau e-wallet.</li><li>Pilih menu scan QRIS dan arahkan ke kode.</li><li>Konfirmasi nominal, lalu selesaikan pembayaran.</li></> : <><li>Buka aplikasi atau ATM bank tujuan.</li><li>Pilih transfer ke virtual account.</li><li>Masukkan nomor VA dan bayar sesuai total.</li></>}</ol> : null}
          {canPay && checkoutUrl && isQris ? <a className="primary-button qris-checkout-link" href={checkoutUrl}>Buka halaman pembayaran</a> : null}
          {canPay ? <p>Pembayaran dapat dibuka kembali melalui Riwayat pembayaran.</p> : null}
        </div>
      </div>
      <footer className="qris-modal-footer">
        <div className="payment-checkout-footer-total"><span>Total pembayaran</span><strong>{money(totalPayment ?? amount)}</strong></div>
        <button className="ghost-button qris-close-action" type="button" onClick={onClose}>{canPay ? 'Bayar nanti' : 'Tutup'}</button>
      </footer>
    </section>
  </div>
}
