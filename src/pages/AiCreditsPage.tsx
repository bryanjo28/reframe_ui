import { useCallback, useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import {
  getPaymentPage,
  type PaymentPageData,
} from '../services/payments'

type AiCreditsPageProps = {
  onTopUp: () => void
  onViewPlans: () => void
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
const formatAmount = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('id-ID') : '—'

export function AiCreditsPage({ onTopUp, onViewPlans }: AiCreditsPageProps) {
  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      setData(await getPaymentPage())
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat AI Credits.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])


  if (loading) {
    return (
      <section className="payments-page">
        <div className="generate-empty-state">
          <AppIcon name="sparkles" />
          <div><strong>Memuat AI Credits...</strong><p>Menyiapkan saldo dan riwayat penggunaanmu.</p></div>
        </div>
      </section>
    )
  }


  return (
    <section className="payments-page ai-credits-page">
      <header className="page-header ai-credits-hero">
        <div>
          <p className="eyebrow">AI Credits</p>
          <h1>Kelola AI Credits kamu</h1>
          <p className="page-description">
            Pantau saldo, pemakaian, dan riwayat credits dalam satu halaman.
          </p>
        </div>
        <div className="payment-balance ai-credits-balance">
          <span>Total AI Credits</span>
          <strong>{formatAmount(data?.balance)}</strong>
          <small>
            Langganan {(data?.subscriptionBalance || 0).toLocaleString('id-ID')} · Top up{' '}
            {(data?.topUpBalance || 0).toLocaleString('id-ID')}
          </small>
        </div>
      </header>

      {error ? <div className="integration-note integration-note-error"><AppIcon name="info" /><p>{error}</p></div> : null}

      <div className="ai-credits-actions">
        <button className="ai-credits-action-card" type="button" onClick={onViewPlans}>
          <span className="ai-credits-action-icon"><AppIcon name="calendar" /></span>
          <span><strong>Lihat paket langganan</strong><small>Dapatkan jatah AI Credits bulanan dan benefit lainnya.</small></span>
          <AppIcon name="chevron-right" />
        </button>
        <button className="ai-credits-action-card" type="button" onClick={onTopUp}>
          <span className="ai-credits-action-icon"><AppIcon name="sparkles" /></span>
          <span><strong>Top up credits</strong><small>Tambah credits kapan saja tanpa mengubah paket langganan.</small></span>
          <AppIcon name="chevron-right" />
        </button>
      </div>

      <div className="payment-detail-grid ai-credits-history-grid">
        <section className="payment-panel">
          <div className="payment-panel-head"><h2>Riwayat credits</h2></div>
          {data?.ledger.length ? data.ledger.map((item) => {
            const amount = item.credits_delta ?? item.amount ?? 0
            return (
              <div className="token-ledger-row" key={item.id}>
                <div><strong>{(item.description || item.transaction_type || item.kind || 'Transaksi credits').replaceAll('_', ' ')}</strong><small>{formatDate(item.created_at)}</small></div>
                <span className={amount > 0 ? 'credit' : 'debit'}>{amount > 0 ? '+' : ''}{amount.toLocaleString('id-ID')}</span>
              </div>
            )
          }) : <p className="payment-empty">Belum ada transaksi credits.</p>}
        </section>
      <section className="payment-panel">
        <div className="payment-panel-head"><h2>Usage History</h2></div>
        {data?.usageHistory?.length ? data.usageHistory.map((item) => (
          <div className="token-ledger-row" key={item.request_id}>
            <div><strong>{item.feature.replaceAll('_', ' ')}</strong><small>{formatDate(item.created_at)} · {item.total_tokens.toLocaleString('id-ID')} token · {item.status}</small></div>
            <span className="debit">-{item.credits_charged} credits</span>
          </div>
        )) : <p className="payment-empty">Belum ada penggunaan AI.</p>}
      </section>
      </div>
    </section>
  )
}
