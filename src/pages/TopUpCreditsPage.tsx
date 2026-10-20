import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { QrisCheckoutModal } from '../components/QrisCheckoutModal'
import { PaymentMethodSelector } from '../components/PaymentMethodSelector'
import { useToast } from '../components/useToast'
import { notifyUsageChanged } from '../services/usage'
import { createPaymentOrder, getPaymentOrderStatus, getPaymentPage, type CreatedPaymentOrder, type PaymentPageData, type TokenPackage } from '../services/payments'

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const allowedPackages = new Set(['mini', 'basic', 'plus', 'max'])

function packageBenefit(pack: TokenPackage) {
  if (pack.code.toLowerCase() === 'mini') return 'Cocok untuk kebutuhan tambahan kecil.'
  if (pack.code.toLowerCase() === 'basic') return 'Pilihan praktis untuk produksi rutin.'
  if (pack.code.toLowerCase() === 'plus') return 'Lebih leluasa untuk banyak variasi konten.'
  return 'Kapasitas terbesar untuk produksi intensif.'
}

export function TopUpCreditsPage({ onBackToCredits, onPaymentComplete, onOpenPayments }: { onBackToCredits: () => void; onPaymentComplete?: (orderId: string) => void; onOpenPayments?: () => void }) {
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('qris')
  const [error, setError] = useState('')
  const [checkoutOrder, setCheckoutOrder] = useState<CreatedPaymentOrder | null>(null)
  const toast = useToast()
  const packages = useMemo(() => data?.packages.filter((pack) => allowedPackages.has(pack.code.toLowerCase())) || [], [data?.packages])
  const selectedPackage = packages.find((pack) => pack.id === selectedId) || packages[0] || null

  const load = useCallback(async () => {
    try {
      const nextData = await getPaymentPage()
      setData(nextData)
      setError('')
      setSelectedId((current) => {
        const nextPackages = nextData.packages.filter((pack) => allowedPackages.has(pack.code.toLowerCase()))
        return nextPackages.some((pack) => pack.id === current) ? current : nextPackages[0]?.id || ''
      })
      setSelectedMethod((current) => nextData.paymentMethods.includes(current) ? current : nextData.paymentMethods[0] || 'qris')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pembayaran.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function checkout() {
    if (!selectedPackage || buying) return
    setBuying(true)
    try {
      const order = await createPaymentOrder({ packageId: selectedPackage.id, method: selectedMethod })
      if (order.checkoutAvailable === false) {
        toast.info('Order tersimpan', order.message || 'Checkout belum tersedia. Coba lagi dari riwayat pembayaran.')
        onOpenPayments?.()
        return
      }
      toast.info('Order pembayaran dibuat', order.message || 'Silakan selesaikan pembayaran.')
      setCheckoutOrder(order)
    } catch (buyError) {
      toast.error('Pembayaran gagal', buyError instanceof Error ? buyError.message : 'Coba lagi.')
    } finally {
      setBuying(false)
    }
  }

  if (loading) return <section className="payments-page"><div className="generate-empty-state"><AppIcon name="sparkles" /><div><strong>Memuat halaman pembayaran...</strong><p>Menyiapkan paket dan saldo AI Credits kamu.</p></div></div></section>

  return (
    <section className="payments-page top-up-page payment-checkout-page">
      <button className="settings-back" type="button" onClick={onBackToCredits}><AppIcon name="chevron-left" /> Kembali ke AI Credits</button>
      <header className="page-header payment-checkout-header"><div><p className="eyebrow">Pembayaran</p><h1>Top up AI Credits</h1><p className="page-description">Pilih paket credits, periksa ringkasan order, lalu selesaikan pembayaran melalui halaman pembayaran yang aman.</p></div><div className="payment-balance"><span>Saldo saat ini</span><strong>{(data?.balance || 0).toLocaleString('id-ID')}</strong><small>AI Credits tersedia</small></div></header>
      {error ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{error}</p></div> : null}

      <div className="payment-checkout-layout">
        <div className="payment-checkout-main">
          <section className="payment-checkout-section">
            <div className="payment-step-title"><span>1</span><div><h2>Pilih paket credits</h2><p>Top up tidak mengubah paket langganan atau entitlement akun.</p></div></div>
            <div className="payment-package-options" role="radiogroup" aria-label="Paket top up AI Credits">
              {packages.map((pack) => {
                const selected = selectedPackage?.id === pack.id
                return <label className={`payment-package-option${selected ? ' selected' : ''}`} key={pack.id}><input type="radio" name="credit-package" value={pack.id} checked={selected} onChange={() => setSelectedId(pack.id)} /><span className="payment-radio" aria-hidden="true" /><span className="payment-package-copy"><span className="subscription-badge">{pack.code}</span><strong>{pack.name}</strong><small>{packageBenefit(pack)}</small></span><span className="payment-package-value"><strong>{pack.token_amount.toLocaleString('id-ID')}</strong><small>AI Credits</small><b>{money(pack.price_idr)}</b></span></label>
              })}
            </div>
          </section>

          <section className="payment-checkout-section">
            <div className="payment-step-title"><span>2</span><div><h2>Metode pembayaran</h2><p>Pilih QRIS atau virtual account yang tersedia.</p></div></div>
            <PaymentMethodSelector methods={data?.paymentMethods || ['qris']} value={selectedMethod} onChange={setSelectedMethod} />
          </section>


        </div>

        <aside className="payment-summary-card" aria-label="Ringkasan pembayaran">
          <p className="eyebrow">Ringkasan order</p>
          {selectedPackage ? <><div className="payment-summary-product"><span><AppIcon name="sparkles" /></span><div><strong>{selectedPackage.name}</strong><small>{selectedPackage.token_amount.toLocaleString('id-ID')} AI Credits</small></div></div><dl><div><dt>Harga paket</dt><dd>{money(selectedPackage.price_idr)}</dd></div><div><dt>Biaya layanan</dt><dd>Rp0</dd></div><div className="payment-summary-total"><dt>Total pembayaran</dt><dd>{money(selectedPackage.price_idr)}</dd></div></dl><button className="primary-button payment-checkout-button" type="button" disabled={buying} onClick={() => void checkout()}>{buying ? 'Membuat order...' : 'Lanjut Pembayaran'}<AppIcon name="chevron-right" /></button><p className="payment-summary-note"><AppIcon name="info" /> Credits masuk setelah pembayaran berhasil diverifikasi oleh server dan berlaku selama 12 bulan.</p></> : <p className="payment-empty">Belum ada paket top up yang tersedia.</p>}
          <div className="payment-trust-list"><span><AppIcon name="lock" /> Pembayaran terenkripsi</span><span><AppIcon name="check" /> Credits diberikan otomatis</span><span><AppIcon name="refresh" /> Webhook aman dan idempotent</span></div>
        </aside>
      </div>
      {checkoutOrder && selectedPackage ? <QrisCheckoutModal
        open
        title={selectedPackage.name}
        description={`${selectedPackage.token_amount.toLocaleString('id-ID')} AI Credits`}
        amount={checkoutOrder.amount_idr || selectedPackage.price_idr}
        totalPayment={checkoutOrder.payment?.total_payment}
        paymentMethod={checkoutOrder.payment_method || selectedMethod}
        qrString={checkoutOrder.payment?.qr_string}
        vaNumber={checkoutOrder.payment?.va_number}
        qrImageUrl={checkoutOrder.qrImageUrl}
        checkoutUrl={checkoutOrder.checkoutUrl}
        expiresAt={checkoutOrder.providerExpiresAt || checkoutOrder.payment?.expired_at || checkoutOrder.expiresAt}
        orderId={checkoutOrder.id}
        checkStatus={getPaymentOrderStatus}
        onPaid={(orderId) => { notifyUsageChanged(); void load(); onPaymentComplete?.(orderId) }}
        onClose={() => { setCheckoutOrder(null); onOpenPayments?.() }}
      /> : null}
    </section>
  )
}
