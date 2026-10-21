import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { QrisCheckoutModal } from '../components/QrisCheckoutModal'
import { PaymentMethodSelector } from '../components/PaymentMethodSelector'
import { CheckoutOrderSummary } from '../components/CheckoutOrderSummary'
import { useToast } from '../components/useToast'
import { notifyUsageChanged } from '../services/usage'
import { createPaymentOrder, getPaymentOrderStatus, getPaymentPage, type CreatedPaymentOrder, type PaymentPageData, type TokenPackage } from '../services/payments'
import type { UiLanguage } from '../utils/uiLanguage'
import { getPreferredPaymentMethod, hasPaymentMethod } from '../utils/paymentMethods'

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const allowedPackages = new Set(['mini', 'basic', 'plus', 'max'])

function packageName(pack: TokenPackage, language: UiLanguage) {
  if (language === 'id') return pack.name
  const names: Record<string, string> = { mini: 'Mini', basic: 'Basic', plus: 'Plus', max: 'Max' }
  return names[pack.code.toLowerCase()] || pack.name
}
export function TopUpCreditsPage({ onBackToCredits, onPaymentComplete, onOpenPayments, language = 'id' }: { onBackToCredits: () => void; onPaymentComplete?: (orderId: string) => void; onOpenPayments?: () => void; language?: UiLanguage }) {
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
  const paymentMethods = data?.paymentMethods || []
  const hasValidPaymentMethod = hasPaymentMethod(paymentMethods, selectedMethod)

  const load = useCallback(async () => {
    try {
      const nextData = await getPaymentPage()
      setData(nextData)
      setError('')
      setSelectedId((current) => {
        const nextPackages = nextData.packages.filter((pack) => allowedPackages.has(pack.code.toLowerCase()))
        return nextPackages.some((pack) => pack.id === current) ? current : nextPackages[0]?.id || ''
      })
      setSelectedMethod((current) => hasPaymentMethod(nextData.paymentMethods, current) ? current : getPreferredPaymentMethod(nextData.paymentMethods))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pembayaran.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function checkout() {
    if (!selectedPackage || !hasPaymentMethod(paymentMethods, selectedMethod) || buying) return
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

  const numberLocale = language === 'en' ? 'en-US' : 'id-ID'
  const continueLabel = language === 'en' ? 'Continue to payment' : 'Lanjutkan Pembayaran'

  return (
    <section className="payments-page top-up-page payment-checkout-page">
      <button className="settings-back" type="button" onClick={onBackToCredits}><AppIcon name="chevron-left" /> {language === 'en' ? 'Back to AI Credits' : 'Kembali ke AI Credits'}</button>
      <header className="page-header payment-checkout-header"><div><p className="eyebrow">{language === 'en' ? 'Checkout' : 'Checkout'}</p><h1>{language === 'en' ? 'Top up AI Credits' : 'Top up AI Credits'}</h1><p className="page-description">{language === 'en' ? 'Choose a credit package, review your order, then select a payment method.' : 'Pilih paket credits, periksa ringkasan order, lalu pilih metode pembayaran.'}</p></div><div className="payment-balance"><span>{language === 'en' ? 'Current balance' : 'Saldo saat ini'}</span><strong>{(data?.balance || 0).toLocaleString(numberLocale)}</strong><small>AI Credits {language === 'en' ? 'available' : 'tersedia'}</small></div></header>
      {error ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{error}</p></div> : null}

      <div className="payment-checkout-layout">
        <div className="payment-checkout-main">
          <section className="payment-checkout-section">
            <div className="payment-step-title"><span>1</span><div><h2>{language === 'en' ? 'Choose a credit package' : 'Pilih paket credits'}</h2><p>{language === 'en' ? 'Your top-up does not change your subscription.' : 'Top up tidak mengubah paket langgananmu.'}</p></div></div>
            {packages.length ? <div className="payment-package-options" role="radiogroup" aria-label={language === 'en' ? 'AI Credits top-up package' : 'Paket top up AI Credits'}>
              {packages.map((pack) => {
                const selected = selectedPackage?.id === pack.id
                return <label className={`payment-package-option${selected ? ' selected' : ''}`} key={pack.id}><input type="radio" name="credit-package" value={pack.id} aria-label={`${packageName(pack, language)}, ${pack.token_amount.toLocaleString(numberLocale)} AI Credits`} checked={selected} onChange={() => setSelectedId(pack.id)} /><span className="payment-radio" aria-hidden="true" /><span className="payment-package-copy"><strong>{packageName(pack, language)}</strong><small>{pack.token_amount.toLocaleString(numberLocale)} AI Credits</small></span><strong className="payment-package-price">{money(pack.price_idr)}</strong></label>
              })}
            </div> : <p className="payment-empty">{language === 'en' ? 'No top-up packages are currently available.' : 'Belum ada paket top up yang tersedia.'}</p>}
          </section>

          {selectedPackage ? <CheckoutOrderSummary
            title={language === 'en' ? 'Order summary' : 'Ringkasan order'}
            name={packageName(selectedPackage, language)}
            description={`${selectedPackage.token_amount.toLocaleString(numberLocale)} AI Credits`}
            rows={[{ label: language === 'en' ? 'Package price' : 'Harga paket', value: money(selectedPackage.price_idr) }]}
            totalLabel={language === 'en' ? 'Total payment' : 'Total pembayaran'}
            total={money(selectedPackage.price_idr)}
            note={language === 'en' ? 'Credits are added after the payment is verified by the server.' : 'Credits masuk setelah pembayaran berhasil diverifikasi oleh server.'}
          /> : null}

          <section className="payment-checkout-section">
            <div className="payment-step-title"><span>2</span><div><h2>{language === 'en' ? 'Payment method' : 'Metode pembayaran'}</h2><p>{language === 'en' ? 'Choose QRIS or a bank virtual account.' : 'Pilih QRIS atau virtual account bank.'}</p></div></div>
            <PaymentMethodSelector methods={paymentMethods} value={selectedMethod} onChange={setSelectedMethod} language={language} />
          </section>

          <footer className="payment-checkout-footer">
            <div className="payment-checkout-footer-total"><span>{language === 'en' ? 'Total payment' : 'Total pembayaran'}</span><strong>{selectedPackage ? money(selectedPackage.price_idr) : '—'}</strong></div>
            <button className="primary-button payment-checkout-button" type="button" disabled={!selectedPackage || !hasValidPaymentMethod || buying} onClick={() => void checkout()}>
              {buying ? (language === 'en' ? 'Creating order…' : 'Membuat order…') : continueLabel}
              {!buying ? <AppIcon name="chevron-right" /> : null}
            </button>
          </footer>
        </div>
      </div>
      {checkoutOrder && selectedPackage ? <QrisCheckoutModal
        open
        title={packageName(selectedPackage, language)}
        description={`${selectedPackage.token_amount.toLocaleString(numberLocale)} AI Credits`}
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
