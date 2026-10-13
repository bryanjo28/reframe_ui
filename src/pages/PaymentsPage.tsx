import { useCallback, useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { createPaymentOrder, getPaymentPage, type PaymentPageData } from '../services/payments'

const money = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export function PaymentsPage({ onBackToCredits }: { onBackToCredits: () => void }) {
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState('')
  const [error, setError] = useState('')
  const toast = useToast()
  const packages = data?.packages.filter((pack) => ['mini', 'basic', 'plus', 'max'].includes(pack.code.toLowerCase())) || []

  const load = useCallback(async () => {
    try {
      setData(await getPaymentPage())
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pembayaran.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function buy(packageId: string) {
    setBuying(packageId)
    try {
      const order = await createPaymentOrder(packageId)
      toast.info('Order pembayaran dibuat', order.message)
      if (order.checkoutUrl) window.location.assign(order.checkoutUrl)
      await load()
    } catch (buyError) {
      toast.error('Pembayaran gagal', buyError instanceof Error ? buyError.message : 'Coba lagi.')
    } finally {
      setBuying('')
    }
  }

  if (loading) return <section className="payments-page"><div className="generate-empty-state"><AppIcon name="sparkles" /><div><strong>Memuat paket top up...</strong><p>Menyiapkan pilihan credits untukmu.</p></div></div></section>

  return <section className="payments-page top-up-page">
    <button className="settings-back" type="button" onClick={onBackToCredits}><AppIcon name="chevron-left" /> Kembali ke AI Credits</button>
    <header className="page-header payment-hero"><div><p className="eyebrow">Top up</p><h1>Top up AI Credits</h1><p className="page-description">Pilih jumlah credits yang kamu butuhkan. Saldo masuk setelah pembayaran diverifikasi server.</p></div><div className="payment-balance"><span>Total AI Credits</span><strong>{(data?.balance || 0).toLocaleString('id-ID')}</strong><small>Langganan {(data?.subscriptionBalance || 0).toLocaleString('id-ID')} · Top up {(data?.topUpBalance || 0).toLocaleString('id-ID')}</small></div></header>
    {error ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{error}</p></div> : null}
    <div className="payment-provider-note"><AppIcon name="info" /><div><strong>Pembayaran aman melalui Midtrans</strong><p>Top up berlaku 12 bulan dan baru ditambahkan setelah status pembayaran diverifikasi oleh server.</p></div></div>
    <div className="token-package-grid">{packages.map((pack) => <article className="token-package-card" key={pack.id}><span className="subscription-badge">{pack.code}</span><h3>{pack.name}</h3><strong className="token-package-amount">{pack.token_amount.toLocaleString('id-ID')} credits</strong><p>{(pack.token_amount * 5000).toLocaleString('id-ID')} token allowance</p><p>{money(pack.price_idr)}</p><button className="primary-button" type="button" disabled={buying === pack.id} onClick={() => void buy(pack.id)}>{buying === pack.id ? 'Membuat order...' : 'Top Up'}</button></article>)}</div>
  </section>
}
