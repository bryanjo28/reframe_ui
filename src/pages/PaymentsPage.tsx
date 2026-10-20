import { useCallback, useEffect, useMemo, useState } from 'react'
import { QrisCheckoutModal } from '../components/QrisCheckoutModal'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { notifyUsageChanged } from '../services/usage'
import { retryPaymentCheckout, getPaymentOrderStatus, getPaymentPage, type PaymentPageData, type PaymentOrder, type PaymentOrderDetails } from '../services/payments'
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const orderFilters = [['all', 'Semua'], ['pending', 'Pending'], ['paid', 'Berhasil'], ['failed', 'Gagal'], ['expired', 'Kedaluwarsa'], ['cancelled', 'Dibatalkan'], ['refunded', 'Refund']] as const
type OrderFilter = typeof orderFilters[number][0]
const statusLabels: Record<string, string> = { pending: 'Pending', paid: 'Berhasil', failed: 'Gagal', expired: 'Kedaluwarsa', cancelled: 'Dibatalkan', refunded: 'Refund' }


export function PaymentsPage({ onBackToCredits }: { onBackToCredits: () => void }) {
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
  const [checkingOrderId, setCheckingOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<{ order: PaymentOrder; detail: PaymentOrderDetails } | null>(null)
  const toast = useToast()
  const filteredOrders = useMemo(() => data?.orders.filter((order) => orderFilter === 'all' || order.status.toLowerCase() === orderFilter) || [], [data?.orders, orderFilter])
  const load = useCallback(async () => {
    try { setData(await getPaymentPage()); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat pembayaran.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function retryCheckout(order: PaymentOrder) {
    if (checkingOrderId || order.status.toLowerCase() !== 'pending') return
    setCheckingOrderId(order.id)
    try {
      const result = await retryPaymentCheckout(order.id)
      if (result.checkoutAvailable === false) {
        toast.error('Checkout belum tersedia', result.message || 'Order tetap tersimpan. Silakan coba lagi.')
        return
      }
      setSelectedOrder({ order, detail: result })
    } catch (cause) {
      toast.error('Checkout belum tersedia', cause instanceof Error ? cause.message : 'Order tetap tersimpan. Silakan coba lagi.')
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
      setData((current) => current ? { ...current, orders: current.orders.map((order) => order.id === orderId ? { ...order, status: result.status } : order) } : current)
      const order = data?.orders.find((item) => item.id === orderId)
      if (order) setSelectedOrder({ order, detail: result })
      if (result.status.toLowerCase() !== 'pending') await load()
      if (result.status.toLowerCase() === 'paid' && order?.status.toLowerCase() === 'pending') notifyUsageChanged()
      toast.info('Status pembayaran diperbarui', statusLabels[result.status.toLowerCase()] || result.status)
    } catch (statusError) {
      toast.error('Status belum dapat diperbarui', statusError instanceof Error ? statusError.message : 'Coba lagi.')
    } finally {
      setCheckingOrderId('')
    }
  }


  return <section className="payments-page payment-checkout-page">
    <button className="settings-back" type="button" onClick={onBackToCredits}><AppIcon name="chevron-left" /> Kembali ke AI Credits</button>
    {error ? <div role="alert" className="integration-note integration-note-error">{error}</div> : null}
    {loading ? <p role="status">Memuat riwayat pembayaran...</p> : null}
          {!loading ? <section className="payment-checkout-section payment-order-history" aria-label="Riwayat pembayaran">
            <div className="payment-step-title plain"><div><h2>Riwayat pembayaran</h2><p>Maksimal 10 order terbaru dari akun kamu.</p></div></div>
            <div className="payment-order-filters" aria-label="Filter status pembayaran">{orderFilters.map(([value, label]) => <button className={orderFilter === value ? 'active' : ''} type="button" aria-pressed={orderFilter === value} onClick={() => setOrderFilter(value)} key={value}>{label}</button>)}</div>
            {filteredOrders.length ? filteredOrders.map((order) => {
              const status = order.status.toLowerCase()
              const title = order.product_name || `${(order.token_amount || 0).toLocaleString('id-ID')} AI Credits`
              return <div className="payment-order-row" key={order.id}>
                <div><strong>{title}</strong><small>{formatDate(order.created_at)} Â· {order.id.slice(0, 8).toUpperCase()}</small></div>
                <span>{money(order.amount_idr)}</span>
                <div className="payment-order-actions"><b className={`payment-order-status ${status}`}>{statusLabels[status] || order.status}</b><button className={status === 'paid' ? 'payment-detail-paid' : ''} type="button" disabled={Boolean(checkingOrderId)} aria-label={`${status === 'pending' ? 'Cek status' : 'Detail'} ${title}`} onClick={() => void refreshPendingOrder(order.id)}>{checkingOrderId === order.id ? 'Memproses...' : status === 'pending' ? 'Cek status' : 'Detail'}</button>{status === 'pending' ? <button type="button" disabled={Boolean(checkingOrderId)} aria-label={`Coba lagi ${title}`} onClick={() => void retryCheckout(order)}>{checkingOrderId === order.id ? 'Memproses...' : 'Coba lagi'}</button> : null}</div>
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
      expiresAt={selectedOrder.detail.providerExpiresAt}
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
