import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { getPaymentOrderStatus, getPaymentPage, type PaymentPageData } from '../services/payments'
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
  const toast = useToast()
  const filteredOrders = useMemo(() => data?.orders.filter((order) => orderFilter === 'all' || order.status.toLowerCase() === orderFilter) || [], [data?.orders, orderFilter])
  const load = useCallback(async () => {
    try { setData(await getPaymentPage()); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat pembayaran.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function refreshPendingOrder(orderId: string) {
    if (checkingOrderId) return
    setCheckingOrderId(orderId)
    try {
      const result = await getPaymentOrderStatus(orderId)
      setData((current) => current ? { ...current, orders: current.orders.map((order) => order.id === orderId ? { ...order, status: result.status } : order) } : current)
      await load()
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
                <div className="payment-order-actions"><b className={`payment-order-status ${status}`}>{statusLabels[status] || order.status}</b>{status === 'pending' ? <button type="button" disabled={Boolean(checkingOrderId)} aria-label={`Cek status ${title}`} onClick={() => void refreshPendingOrder(order.id)}>{checkingOrderId === order.id ? 'Mengecek...' : 'Cek status'}</button> : null}</div>
              </div>
            }) : <p className="payment-empty">Tidak ada pembayaran dengan status ini.</p>}
          </section> : null}
  </section>
}

