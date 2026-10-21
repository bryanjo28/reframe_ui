import { useCallback, useEffect, useMemo, useState } from 'react'
import { QrisCheckoutModal } from '../components/QrisCheckoutModal'
import { AppIcon } from '../components/AppIcon'
import { notifyUsageChanged } from '../services/usage'
import { retryPaymentCheckout, getPaymentOrderStatus, getPaymentPage, type PaymentPageData, type PaymentOrder, type PaymentOrderDetails } from '../services/payments'
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const orderFilters = [['all', 'Semua'], ['pending', 'Pending'], ['paid', 'Berhasil'], ['failed', 'Gagal'], ['expired', 'Kedaluwarsa'], ['cancelled', 'Dibatalkan'], ['refunded', 'Refund']] as const
type OrderFilter = typeof orderFilters[number][0]
const statusLabels: Record<string, string> = { pending: 'Pending', paid: 'Berhasil', failed: 'Gagal', expired: 'Kedaluwarsa', cancelled: 'Dibatalkan', refunded: 'Refund' }


export function PaymentsPage({ onBackToCredits, onTopUp }: { onBackToCredits: () => void; onTopUp?: () => void }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
  const [checkingOrderId, setCheckingOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<{ order: PaymentOrder; detail: PaymentOrderDetails } | null>(null)
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null)
  useEffect(() => {
    if (!feedback) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setFeedback(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [feedback])
  const filteredOrders = useMemo(() => data?.orders.filter((order) => orderFilter === 'all' || order.status.toLowerCase() === orderFilter) || [], [data?.orders, orderFilter])
  const load = useCallback(async () => {
    try { setData(await getPaymentPage()); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat pembayaran.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function retryCheckout(order: PaymentOrder) {
    if (checkingOrderId || order.status.toLowerCase() !== 'pending' || order.checkoutAvailable !== false) return
    setCheckingOrderId(order.id)
    try {
      const result = await retryPaymentCheckout(order.id)
      setData((current) => current ? { ...current, orders: current.orders.map((item) => item.id === order.id ? {
        ...item, status: result.status, checkoutAvailable: result.checkoutAvailable,
        expired_at: result.payment?.expired_at || result.providerExpiresAt || result.expiresAt || item.expired_at,
      } : item) } : current)
      if (result.checkoutAvailable === false) {
        setFeedback({ title: 'Checkout belum tersedia', message: result.message || 'Order tetap tersimpan. Silakan coba lagi.' })
        return
      }
      setSelectedOrder({ order, detail: result })
    } catch (cause) {
      setFeedback({ title: 'Checkout belum tersedia', message: cause instanceof Error ? cause.message : 'Order tetap tersimpan. Silakan coba lagi.' })
      await load()
    } finally {
      setCheckingOrderId('')
    }
  }
  async function refreshPendingOrder(orderId: string) {
    if (checkingOrderId) return
    setCheckingOrderId(orderId)
    try {
      const result = await getPaymentOrderStatus(orderId)
      setData((current) => current ? { ...current, orders: current.orders.map((order) => order.id === orderId ? { ...order, status: result.status, checkoutAvailable: result.checkoutAvailable ?? order.checkoutAvailable } : order) } : current)
      const order = data?.orders.find((item) => item.id === orderId)
      if (result.status.toLowerCase() === 'pending' && result.checkoutAvailable === false) {
        setFeedback({ title: 'Checkout belum tersedia', message: 'Silakan pilih Coba lagi untuk menyiapkan pembayaran.' })
        return
      }
      if (order) setSelectedOrder({ order, detail: result })
      if (result.status.toLowerCase() !== 'pending') await load()
      if (result.status.toLowerCase() === 'paid' && order?.status.toLowerCase() === 'pending') notifyUsageChanged()
    } catch (statusError) {
      setFeedback({ title: 'Status belum dapat diperbarui', message: statusError instanceof Error ? statusError.message : 'Coba lagi.' })
    } finally {
      setCheckingOrderId('')
    }
  }


  return <section className="payments-page payment-checkout-page">
    {feedback ? <div className="qris-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedback(null) }}>
      <section className="qris-modal" role="dialog" aria-modal="true" aria-label={feedback.title}>
        <header className="qris-modal-header"><h2>{feedback.title}</h2><button type="button" autoFocus onClick={() => setFeedback(null)}>Tutup</button></header>
        <div className="qris-order-panel"><p role="alert">{feedback.message}</p></div>
      </section>
    </div> : null}
    <button className="settings-back" type="button" onClick={onBackToCredits}><AppIcon name="chevron-left" /> Kembali ke AI Credits</button>
    {error ? <div role="alert" className="integration-note integration-note-error">{error}</div> : null}
    {loading ? <p role="status">Memuat riwayat pembayaran...</p> : null}
          {!loading ? <section className="payment-checkout-section payment-order-history" aria-label="Riwayat pembayaran">
            <div className="payment-step-title plain"><div><h2>Riwayat pembayaran</h2><p>Maksimal 10 order terbaru dari akun kamu.</p></div></div>
            <div className="payment-order-filters" aria-label="Filter status pembayaran">{orderFilters.map(([value, label]) => <button className={orderFilter === value ? 'active' : ''} type="button" aria-pressed={orderFilter === value} onClick={() => setOrderFilter(value)} key={value}>{label}</button>)}</div>
            {filteredOrders.length ? filteredOrders.map((order) => {
              const status = order.status.toLowerCase()
              const isTopUp = (order.order_type || order.product_type) !== 'subscription'
              const expiry = order.expired_at || order.providerExpiresAt || order.payment?.expired_at
              const expiryTime = expiry ? Date.parse(expiry) : NaN
              const timedOut = status === 'expired' || (status === 'pending' && Number.isFinite(expiryTime) && expiryTime <= now)
              const unavailable = status === 'pending' && (order.checkoutAvailable === false || !Number.isFinite(expiryTime))
              const canTopUpAgain = isTopUp && status === 'cancelled'
              const label = status === 'pending' ? timedOut ? 'Waktu pembayaran habis' : unavailable ? 'QRIS belum tersedia' : 'Menunggu pembayaran' : status === 'paid' ? 'Pembayaran berhasil' : statusLabels[status] || order.status
              const action = canTopUpAgain && onTopUp ? 'Top up lagi' : status === 'pending' && !timedOut ? unavailable ? 'Coba lagi' : 'Lanjutkan pembayaran' : 'Lihat detail'
              const title = order.product_name || (order.order_type === 'subscription' ? `Subscription · ${order.duration_months || 1} bulan` : `${(order.token_amount || 0).toLocaleString('id-ID')} AI Credits`)
              return <div className="payment-order-row" key={order.id}>
                <div><strong>{title}</strong><small>{order.order_type === 'subscription' ? `${(order.monthly_credits || 0).toLocaleString('id-ID')} AI Credits / bulan · bayar sekali` : 'Top up AI Credits'} · {formatDate(order.created_at)} · {order.id.slice(0, 8).toUpperCase()}</small></div>
                <span>{money(order.amount_idr)}</span>
                <div className="payment-order-actions">
                  <b className={`payment-order-status ${status}`}>{label}</b>
                  {!timedOut ? <button
                    className={status === 'paid' ? 'payment-detail-paid' : ''}
                    type="button"
                    disabled={Boolean(checkingOrderId)}
                    aria-label={`${action} ${title}`}
                    onClick={() => canTopUpAgain && onTopUp ? onTopUp() : void (status === 'pending' && !timedOut ? retryCheckout(order) : refreshPendingOrder(order.id))}
                  >
                    {checkingOrderId === order.id ? 'Memproses...' : action}
                  </button> : null}
                  {timedOut ? <>
                    <small>Sudah membayar? Cek status terlebih dahulu.</small>
                    <button type="button" disabled={Boolean(checkingOrderId)} aria-label={`Cek status ${title}`} onClick={() => void refreshPendingOrder(order.id)}>Cek status</button>
                  </> : null}
                </div>
              </div>
            }) : <p className="payment-empty">Tidak ada pembayaran dengan status ini.</p>}
          </section> : null}
    {selectedOrder ? <QrisCheckoutModal
      key={selectedOrder.order.id}
      open
      title={selectedOrder.order.product_name || 'Pembayaran AI Credits'}
      description={formatDate(selectedOrder.order.created_at)}
      amount={selectedOrder.order.amount_idr}
      totalPayment={selectedOrder.detail.payment?.total_payment ?? selectedOrder.detail.payment?.amount}
      paymentMethod={selectedOrder.detail.payment_method || selectedOrder.order.payment_method || 'qris'}
      qrString={selectedOrder.detail.payment?.qr_string}
      vaNumber={selectedOrder.detail.payment?.va_number}
      checkoutUrl={selectedOrder.detail.checkoutUrl}
      expiresAt={selectedOrder.detail.providerExpiresAt || selectedOrder.detail.payment?.expired_at}
      orderId={selectedOrder.order.id}
      initialStatus={selectedOrder.detail.status}
      checkStatus={getPaymentOrderStatus}
      onStatusChange={(status) => {
        setData((current) => current ? { ...current, orders: current.orders.map((order) => order.id === selectedOrder.order.id ? { ...order, status } : order) } : current)
        if (status !== 'pending') void load()
        if (status === 'paid') notifyUsageChanged()
      }}
      onClose={() => setSelectedOrder(null)}
    /> : null}
  </section>
}
