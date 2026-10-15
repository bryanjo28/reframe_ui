import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AppIcon } from '../components/AppIcon'
import { buildApiHeaders, buildApiUrl } from '../config/api'
import { getCurrentAuthToken } from '../services/authService'

type AdminSection = 'overview' | 'users' | 'profitability' | 'transactions' | 'ai-usage' | 'scheduled-posts' | 'audit-logs' | 'error-logs'
type AdminOverview = {
  metrics: {
    registeredUsers?: number
    newRegistrations?: number
    activeUsers?: number
    activeSubscriptions?: number
    payingUsers?: number
    paidTopUpRevenueIdr?: number
    monthlyRecurringRevenueIdr?: number | null
    estimatedContributionBeforeGatewayFeesIdr?: number
    freeToPaidConversionRate?: number | null
    storedProviderCostUsdRateUnverified?: number
    aiRequests?: number
    totalTokens?: number
    inputTokens?: number
    cachedInputTokens?: number
    outputTokens?: number
    creditsConsumed?: number
    estimatedAiCostIdr?: number
    averageEstimatedCostIdrPerRequest?: number | null
    scheduledPosts?: number
    publishedPosts?: number
    failedPosts?: number
    publishingSuccessRate?: number | null
    freeUsers?: number
    starterSubscribers?: number
    creatorSubscribers?: number
    proSubscribers?: number
    paidOrders?: number
    scheduledJobs?: number
  }
  generatedAt: string
  trends?: { daily?: AdminRow[]; revenueByProduct?: AdminRow[]; aiByFeature?: AdminRow[]; activeSubscribersByPlan?: AdminRow[] }
  coverage?: Record<string, boolean>
  reportingSetupRequired?: boolean
}
type AdminRow = Record<string, unknown>
type AdminList = { items: AdminRow[]; total: number; page: number; limit: number; truncated?: boolean }
type Payload<T> = { data?: T; message?: string }

const metricLabels: Array<[keyof AdminOverview['metrics'], string, string, 'number' | 'currency' | 'usd' | 'percent']> = [
  ['paidTopUpRevenueIdr', 'Recorded top-up revenue', 'Pembayaran top-up berstatus berhasil', 'currency'],
  ['monthlyRecurringRevenueIdr', 'MRR', 'Riwayat pembayaran subscription belum tersedia', 'currency'],
  ['estimatedContributionBeforeGatewayFeesIdr', 'Estimated contribution', 'Top-up less estimated AI cost; before fees', 'currency'],
  ['estimatedAiCostIdr', 'Estimated AI cost', 'Kurs dan tarif perlu verifikasi', 'currency'],
  ['payingUsers', 'Top-up payers', 'Pengguna dengan top-up sukses pada periode', 'number'],
  ['freeToPaidConversionRate', 'Free-to-paid conversion', 'Berdasarkan subscription aktif / semua profil', 'percent'],
  ['storedProviderCostUsdRateUnverified', 'Stored AI cost (USD)', 'Saved provider estimate; pricing unverified', 'usd'],
  ['registeredUsers', 'Registered users', 'Total profil', 'number'],
  ['newRegistrations', 'New registrations', 'Registrasi pada periode', 'number'],
  ['activeUsers', 'Active users', 'Pengguna dengan aktivitas tercatat', 'number'],
  ['freeUsers', 'Free users', 'Tanpa subscription aktif', 'number'],
  ['starterSubscribers', 'Starter subscribers', 'Subscription aktif', 'number'],
  ['creatorSubscribers', 'Creator subscribers', 'Subscription aktif', 'number'],
  ['proSubscribers', 'Pro subscribers', 'Subscription aktif', 'number'],
  ['totalTokens', 'Total tokens', 'Input + output token tercatat', 'number'],
  ['inputTokens', 'Input tokens', 'Input token tercatat', 'number'],
  ['cachedInputTokens', 'Cached input tokens', 'Bagian dari input; tidak dihitung dua kali', 'number'],
  ['outputTokens', 'Output tokens', 'Output token tercatat', 'number'],
  ['creditsConsumed', 'Credits consumed', 'Dari log pemakaian AI', 'number'],
  ['aiRequests', 'AI requests', 'Permintaan AI tercatat', 'number'],
  ['averageEstimatedCostIdrPerRequest', 'Average AI cost/request', 'Estimasi internal', 'currency'],
  ['scheduledPosts', 'Scheduled posts', 'Konten terjadwal pada periode', 'number'],
  ['publishedPosts', 'Published posts', 'Post berhasil terkirim', 'number'],
  ['failedPosts', 'Failed posts', 'Post gagal terkirim', 'number'],
  ['publishingSuccessRate', 'Publishing success rate', 'Post selesai: berhasil / selesai', 'percent'],
]

const sections: Array<[AdminSection, string, string]> = [
  ['overview', 'Overview', 'Ringkasan operasional'],
  ['users', 'Users', 'Akun, plan dan saldo kredit'],
  ['profitability', 'Profitability', 'Perbandingan pembayaran dan konsumsi AI'],
  ['transactions', 'Transactions', 'Order top up dan Midtrans'],
  ['ai-usage', 'AI usage', 'Token, biaya dan kredit'],
  ['scheduled-posts', 'Scheduled posts', 'Antrean dan hasil publish'],
  ['audit-logs', 'Audit logs', 'Riwayat tindakan admin'],
  ['error-logs', 'Error logs', 'Error server dan API'],
]

function formatNumber(value: unknown) {
  return new Intl.NumberFormat('id-ID').format(Number(value) || 0)
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID')
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatEstimatedCostIdr(value: unknown) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function formatMetric(value: unknown, kind: 'number' | 'currency' | 'usd' | 'percent') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  if (kind === 'currency') return formatCurrency(value)
  if (kind === 'usd') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value))
  if (kind === 'percent') return `${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
  return formatNumber(value)
}

function isoRange(from: string, to: string) {
  const start = from ? new Date(`${from}T00:00:00.000Z`).toISOString() : ''
  const end = to ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000).toISOString() : ''
  return { start, end }
}

async function adminRequest<T>(path: string) {
  const token = getCurrentAuthToken()
  const response = await fetch(buildApiUrl(path), {
    headers: buildApiHeaders({ additionalHeaders: token ? { Authorization: `Bearer ${token}` } : {} }),
  })
  const payload = (await response.json()) as Payload<T>
  if (!response.ok) throw new Error(payload.message || 'Data admin tidak dapat dimuat.')
  return payload.data
}

function value(row: AdminRow, key: string) {
  const item = row[key]
  return typeof item === 'string' || typeof item === 'number' ? item : '—'
}

function AdminTable({ columns, rows, empty, onSelect }: { columns: Array<[string, string, (row: AdminRow) => ReactNode]>; rows: AdminRow[]; empty: string; onSelect?: (row: AdminRow) => void }) {
  if (!rows.length) return <div className="panel admin-empty">{empty}</div>
  return <div className="panel admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(([key, title]) => <th key={key} scope="col">{title}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.requestId ?? index)} onClick={onSelect ? () => onSelect(row) : undefined} onKeyDown={onSelect ? (event) => { if (event.key === 'Enter') onSelect(row) } : undefined} tabIndex={onSelect ? 0 : undefined} className={onSelect ? 'admin-table-row-clickable' : undefined}>{columns.map(([key, , render]) => <td key={key}>{render(row)}</td>)}</tr>)}</tbody></table></div>
}

function StatusBadge({ status }: { status: unknown }) {
  const label = typeof status === 'string' ? status.replaceAll('_', ' ') : 'unknown'
  return <span className={`admin-status admin-status-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>
}

function TrendChart({ title, rows, valueKey, compareKey, unit = 'number' }: { title: string; rows: AdminRow[]; valueKey: string; compareKey?: string; unit?: 'number' | 'currency' }) {
  if (!rows.length) return <article className="panel admin-chart-card"><h3>{title}</h3><p className="admin-data-note">Belum ada data pada rentang ini.</p></article>
  const maxValue = Math.max(1, ...rows.flatMap((row) => [Number(row[valueKey]) || 0, compareKey ? Number(row[compareKey]) || 0 : 0]))
  const format = (n: number) => unit === 'currency' ? formatCurrency(n) : formatNumber(n)
  return <article className="panel admin-chart-card"><h3>{title}</h3><div className="admin-chart-legend"><span>{valueKey === 'revenueIdr' ? 'Recorded top-up revenue' : valueKey === 'estimatedAiCostIdr' ? 'Estimated AI cost' : valueKey === 'newUsers' ? 'Registrations' : 'AI usage'}</span>{compareKey ? <span>{compareKey === 'estimatedAiCostIdr' ? 'Estimated AI cost' : compareKey}</span> : null}</div><div className="admin-bar-chart" role="img" aria-label={title}>{rows.map((row, index) => {
    const primary = Number(row[valueKey]) || 0
    const secondary = compareKey ? Number(row[compareKey]) || 0 : 0
    return <div className="admin-bar-group" key={String(row.date || row.feature || row.name || index)} title={`${String(row.date || row.feature || row.name || '')}: ${format(primary)}${compareKey ? ` / ${format(secondary)}` : ''}`}><div className="admin-bar-pair"><span className="admin-bar admin-bar-primary" style={{ height: `${Math.max(primary > 0 ? 3 : 0, primary / maxValue * 100)}%` }} /><span className="admin-bar admin-bar-secondary" style={{ height: `${Math.max(secondary > 0 ? 3 : 0, secondary / maxValue * 100)}%` }} /></div><small>{rows.length <= 14 || index % Math.ceil(rows.length / 10) === 0 ? String(row.date || row.feature || row.name || '').slice(5, 10) : ''}</small></div>
  })}</div><div className="admin-chart-scale"><span>{format(0)}</span><span>{format(maxValue)}</span></div></article>
}

function UnavailableChart({ title, message }: { title: string; message: string }) {
  return <article className="panel admin-chart-card"><h3>{title}</h3><p className="admin-data-note">{message}</p></article>
}

function reportingWindow(days: number) {
  const end = new Date()
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

export function AdminDashboardPage({ onBackToUser }: { onBackToUser: () => void }) {
  const knownSections = sections.map(([key]) => key)
  const sectionFromPath = window.location.pathname.split('/')[2] as AdminSection | undefined
  const [section, setSection] = useState<AdminSection>(sectionFromPath && knownSections.includes(sectionFromPath) ? sectionFromPath : 'overview')
  const [selectedUserId, setSelectedUserId] = useState(() => window.location.pathname.match(/^\/admin\/users\/([^/]+)$/)?.[1] || '')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [list, setList] = useState<AdminList | null>(null)
  const [userDetail, setUserDetail] = useState<AdminRow | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const initialWindow = reportingWindow(30)
  const [from, setFrom] = useState(initialWindow.from)
  const [to, setTo] = useState(initialWindow.to)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('highest_revenue')
  const [plan, setPlan] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (section === 'overview') {
        const range = isoRange(from, to)
        const params = new URLSearchParams()
        if (range.start) params.set('from', range.start)
        if (range.end) params.set('to', range.end)
        const data = await adminRequest<AdminOverview>(`/api/admin/overview?${params.toString()}`)
        setOverview(data || null)
      } else {
        const params = new URLSearchParams({ page: String(page), limit: '25' })
        if (query.trim()) params.set('query', query.trim())
        if (status) params.set('status', status)
        const range = isoRange(from, to)
        if (range.start) params.set('from', range.start)
        if (range.end) params.set('to', range.end)
        if (section === 'profitability') {
          params.set('sort', sort)
          if (plan) params.set('plan', plan)
        }
        if (section === 'users' && selectedUserId) {
          const details = await adminRequest<AdminRow>(`/api/admin/users/${encodeURIComponent(selectedUserId)}?${params.toString()}`)
          setUserDetail(details || null)
        } else {
          const data = await adminRequest<AdminList>(`/api/admin/${section}?${params.toString()}`)
          setList(data || { items: [], total: 0, page, limit: 25 })
          setUserDetail(null)
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Data admin tidak dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }, [section, selectedUserId, page, query, status, from, to, sort, plan])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1); setStatus(''); if (section !== 'users') setSelectedUserId('') }, [section])
  useEffect(() => { window.history.replaceState({}, document.title, section === 'overview' ? '/admin' : selectedUserId && section === 'users' ? `/admin/users/${encodeURIComponent(selectedUserId)}` : `/admin/${section}`) }, [section, selectedUserId])

  const openUser = (row: AdminRow) => {
    setSelectedUserId(String(row.id || ''))
    setUserDetail(null)
    setSection('users')
  }

  const columns: Array<[string, string, (row: AdminRow) => ReactNode]> = section === 'profitability' ? [
    ['user', 'User', (row) => <><strong>{value(row, 'full_name') || value(row, 'account_name')}</strong><small>{value(row, 'account_name')}</small></>],
    ['plan_name', 'Plan', (row) => value(row, 'plan_name')],
    ['subscription_paid', 'Subscription paid', () => 'Unavailable'],
    ['top_up_paid_idr', 'Top-up paid', (row) => formatCurrency(row.top_up_paid_idr)],
    ['known_net_revenue_idr', 'Known net revenue', (row) => formatCurrency(row.known_net_revenue_idr)],
    ['credits_granted', 'Credits granted', (row) => formatNumber(row.credits_granted)], ['credits_used', 'Credits used', (row) => formatNumber(row.credits_used)],
    ['input_tokens', 'Input', (row) => formatNumber(row.input_tokens)], ['cached_input_tokens', 'Cached input', (row) => formatNumber(row.cached_input_tokens)],
    ['output_tokens', 'Output', (row) => formatNumber(row.output_tokens)], ['total_tokens', 'Total tokens', (row) => formatNumber(row.total_tokens)],
    ['estimated_ai_cost_idr', 'Estimated AI cost', (row) => formatCurrency(row.estimated_ai_cost_idr)],
    ['actual_ai_cost_usd', 'Stored AI cost (USD)', (row) => `$${Number(row.actual_ai_cost_usd || 0).toFixed(4)}*`],
    ['gateway_fees', 'Gateway fees', () => 'Unavailable'],
    ['estimated_contribution_before_gateway_fees_idr', 'Est. contribution*', (row) => formatCurrency(row.estimated_contribution_before_gateway_fees_idr)],
    ['estimated_margin_before_gateway_fees_pct', 'Est. margin*', (row) => row.estimated_margin_before_gateway_fees_pct == null ? 'N/A' : `${value(row, 'estimated_margin_before_gateway_fees_pct')}%`],
  ] : section === 'users' ? [
    ['user', 'User', (row) => <><strong>{value(row, 'name')}</strong><small>{value(row, 'accountName')}</small></>],
    ['registeredAt', 'Registered', (row) => formatDate(row.registeredAt)],
    ['plan', 'Plan', (row) => value(row, 'plan')],
    ['subscriptionStatus', 'Subscription', (row) => <StatusBadge status={row.subscriptionStatus} />],
    ['creditsAvailable', 'Credits left', (row) => formatNumber(row.creditsAvailable)],
    ['creditsConsumed', 'Credits used', (row) => formatNumber(row.creditsConsumed)],
    ['totalTokens', 'Tokens', (row) => formatNumber(row.totalTokens)],
    ['threadsConnected', 'Threads', (row) => row.threadsConnected ? 'Connected' : '—'],
    ['totalPaidIdr', 'Paid', (row) => formatCurrency(row.totalPaidIdr)],
  ] : section === 'transactions' ? [
    ['id', 'Order ID', (row) => <code>{value(row, 'id')}</code>], ['user', 'User', (row) => <><strong>{value(row, 'user')}</strong><small>{value(row, 'accountName')}</small></>],
    ['product', 'Product', (row) => value(row, 'product')], ['amountIdr', 'Amount', (row) => formatCurrency(row.amountIdr)],
    ['credits', 'Credits', (row) => formatNumber(row.credits)], ['provider', 'Provider', (row) => value(row, 'provider')],
    ['status', 'Status', (row) => <StatusBadge status={row.status} />], ['createdAt', 'Created', (row) => formatDate(row.createdAt)],
  ] : section === 'ai-usage' ? [
    ['createdAt', 'Time', (row) => formatDate(row.createdAt)], ['user', 'User', (row) => <><strong>{value(row, 'user')}</strong><small>{value(row, 'accountName')}</small></>],
    ['feature', 'Feature', (row) => value(row, 'feature')], ['model', 'Model', (row) => value(row, 'model')],
    ['inputTokens', 'Input', (row) => formatNumber(row.inputTokens)], ['cachedInputTokens', 'Cached', (row) => formatNumber(row.cachedInputTokens)],
    ['outputTokens', 'Output', (row) => formatNumber(row.outputTokens)], ['totalTokens', 'Total', (row) => formatNumber(row.totalTokens)],
    ['creditsCharged', 'Credits', (row) => formatNumber(row.creditsCharged)], ['actualCostUsd', 'API cost (USD)', (row) => `$${Number(row.actualCostUsd || 0).toFixed(6)}`],
    ['estimatedCostIdr', 'Est. cost (IDR)', (row) => formatEstimatedCostIdr(row.estimatedCostIdr)], ['status', 'Status', (row) => <StatusBadge status={row.status} />],
  ] : section === 'scheduled-posts' ? [
    ['user', 'User', (row) => value(row, 'user')], ['content', 'Content', (row) => <span className="admin-content-preview">{typeof row.content === 'string' ? row.content : value(row, 'id')}</span>],
    ['threadsConnected', 'Threads', (row) => row.threadsConnected ? 'Connected' : '—'], ['scheduledAt', 'Scheduled', (row) => formatDate(row.scheduledAt)],
    ['publishedAt', 'Published', (row) => formatDate(row.publishedAt)], ['status', 'Status', (row) => <StatusBadge status={row.status} />],
    ['attempts', 'Retries', (row) => formatNumber(row.attempts)], ['error', 'Error', (row) => value(row, 'error')],
  ] : section === 'audit-logs' ? [
    ['created_at', 'Time', (row) => formatDate(row.created_at)], ['admin_user_id', 'Admin ID', (row) => <code>{value(row, 'admin_user_id')}</code>],
    ['action', 'Action', (row) => value(row, 'action')], ['target_type', 'Target', (row) => `${value(row, 'target_type')} / ${value(row, 'target_id')}`],
    ['reason', 'Reason', (row) => value(row, 'reason')], ['result_status', 'Result', (row) => <StatusBadge status={row.result_status} />],
  ] : [
    ['created_at', 'Time', (row) => formatDate(row.created_at)], ['status_code', 'HTTP', (row) => <StatusBadge status={row.status_code} />],
    ['method_path', 'Request', (row) => <><strong>{value(row, 'method')} {value(row, 'path')}</strong><small>{value(row, 'error_name')}</small></>],
    ['error_code', 'Error code', (row) => <code>{value(row, 'error_code')}</code>],
    ['message', 'Message', (row) => <span className="admin-content-preview">{value(row, 'message')}</span>],
    ['user_id', 'User ID', (row) => row.user_id ? <code>{value(row, 'user_id')}</code> : '—'],
    ['request_id', 'Request ID', (row) => <code>{value(row, 'request_id')}</code>],
  ]

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div><p className="eyebrow">Alurin operations</p><h1>Admin Control Center</h1><p className="page-description">Monitoring dan data operasional aktual.</p></div>
        <button className="ghost-button admin-back-button" type="button" onClick={onBackToUser}><AppIcon name="chevron-left" /> Kembali ke dashboard pengguna</button>
      </header>

      <div className="admin-layout">
        <nav className="panel admin-nav" aria-label="Admin modules">
          {sections.map(([key, label, description]) => <button key={key} type="button" className={`admin-nav-item${section === key ? ' active' : ''}`} onClick={() => setSection(key)} aria-current={section === key ? 'page' : undefined}><strong>{label}</strong><small>{description}</small></button>)}
        </nav>
        <div className="admin-main">
          <header className="admin-section-heading"><div><p className="eyebrow">Operations</p><h2>{sections.find(([key]) => key === section)?.[1]}</h2></div><button className="ghost-button" type="button" onClick={() => void load()} disabled={loading}>Muat ulang</button></header>

          {section !== 'overview' && section !== 'audit-logs' ? <div className="panel admin-filters">
            <label className="admin-search"><span className="sr-only">Cari</span><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value) }} placeholder={section === 'users' ? 'Cari nama atau account name' : section === 'error-logs' ? 'Cari kode error atau request ID' : 'Cari user, order atau request'} /></label>
            {section === 'profitability' ? <>
              <label><span>Paket</span><select value={plan} onChange={(event) => { setPage(1); setPlan(event.target.value) }}><option value="">Semua paket</option>{['free', 'starter', 'creator', 'pro'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Urutkan</span><select value={sort} onChange={(event) => { setPage(1); setSort(event.target.value) }}>{[['highest_revenue','Revenue tertinggi'],['highest_ai_cost','Biaya AI tertinggi'],['highest_token_usage','Token tertinggi'],['highest_credit_usage','Kredit tertinggi'],['lowest_profit','Profit terendah'],['highest_profit','Profit tertinggi'],['negative_profit','Profit negatif']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            </> : null}
            {section !== 'users' && section !== 'profitability' ? <label><span>Status</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">Semua status</option>{(section === 'transactions' ? ['pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'] : section === 'ai-usage' ? ['success', 'failed', 'estimated'] : section === 'error-logs' ? ['500', '502', '503', '504', '599'] : ['scheduled', 'processing', 'success', 'failed', 'uncertain', 'cancelled']).map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
            {section !== 'users' ? <><label><span>Dari</span><input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value) }} /></label><label><span>Sampai</span><input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value) }} /></label></> : null}
          </div> : null}

          {loading ? <div className="panel admin-message" role="status">Memuat data…</div> : null}
          {!loading && error ? <div className="panel admin-message admin-message-error" role="alert">{error}</div> : null}
          {section === 'overview' ? <div className="panel admin-filters admin-date-presets"><div className="admin-range-presets"><button type="button" className="ghost-button" onClick={() => { const w = reportingWindow(1); setFrom(w.from); setTo(w.to) }}>Hari ini</button><button type="button" className="ghost-button" onClick={() => { const w = reportingWindow(7); setFrom(w.from); setTo(w.to) }}>7 hari</button><button type="button" className="ghost-button" onClick={() => { const w = reportingWindow(30); setFrom(w.from); setTo(w.to) }}>30 hari</button></div><label><span>Dari</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>Sampai</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div> : null}
          {!loading && !error && section === 'overview' && overview ? <>
            <div className="admin-metric-grid">{metricLabels.map(([key, label, description, kind]) => <article className="panel admin-metric-card" key={key}><span className="admin-metric-label">{label}</span><strong>{formatMetric(overview.metrics[key], kind)}</strong><small>{description}</small></article>)}</div>
            <div className="panel admin-data-note-box"><strong>Coverage dan kualitas data</strong><p>{overview.reportingSetupRequired ? 'Agregasi analytics belum tersedia sampai skrip admin_monitoring_setup.sql diterapkan ke database.' : 'Revenue di sini hanya top-up sukses yang tersimpan. Subscription revenue/MRR, biaya gateway, kurs historis, dan last-active tidak tersedia. Biaya AI IDR merupakan estimasi internal, bukan biaya aktual provider.'}</p><span>Snapshot {formatDate(overview.generatedAt)}</span></div>
            {overview.trends ? <div className="admin-chart-grid"><TrendChart title="Revenue trend (top-ups only)" rows={overview.trends.daily || []} valueKey="revenueIdr" unit="currency" /><TrendChart title="AI cost trend (internal estimate)" rows={overview.trends.daily || []} valueKey="estimatedAiCostIdr" unit="currency" /><TrendChart title="Revenue vs AI cost" rows={overview.trends.daily || []} valueKey="revenueIdr" compareKey="estimatedAiCostIdr" unit="currency" /><TrendChart title="User growth" rows={overview.trends.daily || []} valueKey="newUsers" /><UnavailableChart title="Revenue by subscription plan" message="Subscription payment history is not stored as a canonical financial ledger. Subscription revenue breakdown is unavailable." /><TrendChart title="AI usage by feature" rows={overview.trends.aiByFeature || []} valueKey="tokens" /></div> : null}
          </> : null}
          {section === 'profitability' && !loading && !error && list ? <p className="admin-data-note">* Kontribusi dihitung dari top-up tercatat dikurangi estimasi biaya AI IDR. Angka USD tersimpan dihitung memakai tarif internal yang belum diverifikasi terhadap tagihan provider; model SumoPod belum dikonfigurasi di environment backend saat audit. Pendapatan subscription, refund, biaya gateway, dan kurs historis tidak tersedia, jadi ini bukan profit total atau margin aktual.</p> : null}
          {!loading && !error && section === 'users' && selectedUserId && userDetail ? <UserDetailView detail={userDetail} onBack={() => { setSelectedUserId(''); setUserDetail(null) }} /> : null}
          {!loading && !error && section !== 'overview' && list && !(section === 'users' && selectedUserId) ? <>
            <AdminTable columns={columns} rows={list.items} empty={section === 'error-logs' ? 'Belum ada error server yang tercatat.' : 'Belum ada data untuk filter ini.'} onSelect={section === 'users' ? openUser : undefined} />
            {list.truncated ? <p className="admin-data-note">Daftar users dibatasi pada 100.000 profil untuk menjaga penggunaan database.</p> : null}
            <div className="admin-pagination"><span>{formatNumber(list.total)} records</span><div><button className="ghost-button" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Sebelumnya</button><span>Halaman {page}</span><button className="ghost-button" type="button" onClick={() => setPage((current) => current + 1)} disabled={page * list.limit >= list.total}>Berikutnya</button></div></div>
          </> : null}
          {section === 'error-logs' && !loading && !error ? <p className="admin-data-note">Log mencakup error API/server berstatus 5xx. Body request, kredensial, dan stack trace tidak disimpan.</p> : null}
        </div>
      </div>
    </section>
  )
}

function UserDetailView({ detail, onBack }: { detail: AdminRow; onBack: () => void }) {
  const profile = (detail.profile || {}) as AdminRow
  const credits = (detail.credits || {}) as AdminRow
  const activity = (detail.activity || {}) as AdminRow
  const summary = (detail.profitability || {}) as AdminRow
  const ai = Array.isArray(activity.aiRequests) ? activity.aiRequests as AdminRow[] : []
  const payments = Array.isArray(activity.paymentTransactions) ? activity.paymentTransactions as AdminRow[] : []
  const creditsHistory = Array.isArray(activity.creditTransactions) ? activity.creditTransactions as AdminRow[] : []
  const posts = Array.isArray(activity.scheduledPosts) ? activity.scheduledPosts as AdminRow[] : []
  const miniColumns = (items: Array<[string, string, (row: AdminRow) => ReactNode]>) => items
  return <section className="admin-user-detail">
    <button className="ghost-button" type="button" onClick={onBack}>← Kembali ke daftar pengguna</button>
    <header className="admin-user-detail-heading"><div><p className="eyebrow">User profile</p><h2>{value(profile, 'full_name') || value(profile, 'account_name')}</h2><p>{value(profile, 'email')} · {value(profile, 'id')}</p></div><span className="admin-status">{value(summary, 'plan_name')}</span></header>
    <div className="admin-metric-grid admin-user-detail-metrics">
      {[["Terdaftar", formatDate(profile.created_at)], ["Status paket", value(summary, 'plan_name')], ["Top-up tercatat", formatCurrency(summary.known_net_revenue_idr)], ["Estimasi biaya AI", formatCurrency(summary.estimated_ai_cost_idr)], ["Kontribusi estimasi*", formatCurrency(summary.estimated_contribution_before_gateway_fees_idr)], ["Margin", summary.estimated_margin_before_gateway_fees_pct == null ? 'N/A' : `${value(summary, 'estimated_margin_before_gateway_fees_pct')}%`], ["Kredit tersedia", formatNumber(credits.totalAvailable)], ["Kredit terpakai", formatNumber(summary.credits_used)], ["Token tercatat", formatNumber(summary.total_tokens)], ["Persona / pilar", `${formatNumber(activity.personaCount)} / ${formatNumber(activity.pillarCount)}`], ["Topik / konten", `${formatNumber(activity.topicCount)} / ${formatNumber(activity.generatedContentCount)}`], ["Jadwal post", formatNumber(activity.scheduledPostCount)]].map(([label, metric]) => <article className="panel admin-metric-card" key={String(label)}><span className="admin-metric-label">{label}</span><strong>{metric}</strong></article>)}
    </div>
    <p className="admin-data-note">* Estimasi memakai top-up yang tercatat dan estimasi biaya AI IDR. Data subscription revenue, biaya gateway, refunds lengkap, dan kurs historis belum tersedia.</p>
    <div className="admin-user-history-grid">
      <section><h3>AI requests terbaru</h3><AdminTable columns={miniColumns([['created_at','Waktu',(row)=>formatDate(row.created_at)],['feature','Fitur',(row)=>value(row,'feature')],['model','Model',(row)=>value(row,'model')],['total_tokens','Token',(row)=>formatNumber(row.total_tokens)],['status','Status',(row)=><StatusBadge status={row.status}/>]])} rows={ai} empty="Belum ada riwayat AI." /></section>
      <section><h3>Transaksi terbaru</h3><AdminTable columns={miniColumns([['created_at','Waktu',(row)=>formatDate(row.paid_at || row.created_at)],['amount_idr','Nominal',(row)=>formatCurrency(row.amount_idr)],['provider','Provider',(row)=>value(row,'provider')],['status','Status',(row)=><StatusBadge status={row.status}/>]])} rows={payments} empty="Belum ada transaksi." /></section>
      <section><h3>Perubahan kredit terbaru</h3><AdminTable columns={miniColumns([['created_at','Waktu',(row)=>formatDate(row.created_at)],['transaction_type','Jenis',(row)=>value(row,'transaction_type')],['credits_delta','Perubahan',(row)=>formatNumber(row.credits_delta)],['balance_after','Saldo',(row)=>formatNumber(row.balance_after)]])} rows={creditsHistory} empty="Belum ada transaksi kredit." /></section>
      <section><h3>Post terjadwal terbaru</h3><AdminTable columns={miniColumns([['scheduled_at','Waktu',(row)=>formatDate(row.scheduled_at)],['status','Status',(row)=><StatusBadge status={row.status}/>],['retry_count','Retry',(row)=>formatNumber(row.retry_count)]])} rows={posts} empty="Belum ada jadwal post." /></section>
    </div>
  </section>
}
