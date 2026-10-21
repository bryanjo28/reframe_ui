import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AppIcon } from '../../components/AppIcon'
import { buildApiHeaders, buildApiUrl } from '../../config/api'
import { getCurrentAuthToken } from '../../services/authService'

type AdminSection = 'overview' | 'users' | 'profitability' | 'transactions' | 'ai-usage' | 'scheduled-posts' | 'audit-logs' | 'error-logs' | 'feedback' | 'referrals' | 'subscription-pricing' | 'subscription-financials'
type AdminOverview = {
  metrics: {
    registeredUsers?: number
    newRegistrations?: number
    activeUsers?: number
    activeSubscriptions?: number
    payingUsers?: number
    paidTopUpRevenueIdr?: number
    monthlyRecurringRevenueIdr?: number | null
    subscriptionCashCollectedIdr?: number
    recognizedSubscriptionRevenueIdr?: number
    remainingServiceObligationIdr?: number
    monthlySubscriptionCreditsGranted?: number
    subscriptionActualAiCostUsd?: number
    subscriptionEstimatedAiCostIdr?: number
    estimatedSubscriptionContributionIdr?: number
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
  subscriptionFinancials?: { setupRequired?: boolean; metrics?: AdminRow }
  coverage?: Record<string, boolean>
  reportingSetupRequired?: boolean
}
type AdminRow = Record<string, unknown>
type AdminList = { items: AdminRow[]; total: number; page: number; limit: number; truncated?: boolean }
type ReferralAdminData = AdminList & { config: AdminRow; metrics: AdminRow }
type SubscriptionPricingConfig = { defaultDurationMonths: number; enabledDurations: number[]; expiryReminderDays: number[]; renewalPolicy: string; plans: Record<string, { prices: Record<string, number>; monthlyAiCredits: number }> }
type SubscriptionPricingData = { version: number; draft: SubscriptionPricingConfig; published: SubscriptionPricingConfig; publishedAt: string; updatedAt: string; impact: { changed: boolean; fromVersion: number; proposedVersion: number } }
type SubscriptionFinancials = { asOf: string; metrics: AdminRow; contracts: AdminRow[] }
type Payload<T> = { data?: T; message?: string }

const metricLabels: Array<[keyof AdminOverview['metrics'], string, string, 'number' | 'currency' | 'usd' | 'percent']> = [
  ['paidTopUpRevenueIdr', 'Recorded top-up revenue', 'Pembayaran top-up berstatus berhasil', 'currency'],
  ['monthlyRecurringRevenueIdr', 'MRR', 'Riwayat pembayaran subscription belum tersedia', 'currency'],
  ['subscriptionCashCollectedIdr', 'Subscription cash collected', 'Kas masuk dari QRIS subscription terverifikasi', 'currency'],
  ['recognizedSubscriptionRevenueIdr', 'Recognized subscription revenue', 'Dialokasikan sesuai masa layanan', 'currency'],
  ['remainingServiceObligationIdr', 'Remaining service obligation', 'Nilai periode layanan yang belum diberikan', 'currency'],
  ['monthlySubscriptionCreditsGranted', 'Subscription credits granted', 'Kredit bulanan yang tercatat di ledger', 'number'],
  ['subscriptionActualAiCostUsd', 'Stored subscription AI cost', 'USD tersimpan di log penggunaan', 'usd'],
  ['subscriptionEstimatedAiCostIdr', 'Estimated subscription AI cost', 'Estimasi internal dari log', 'currency'],
  ['estimatedSubscriptionContributionIdr', 'Estimated subscription contribution', 'Recognized revenue less estimated AI cost', 'currency'],
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
  ['feedback', 'Feedback', 'Masukan dari pengguna'],
  ['referrals', 'Referrals', 'Program referral, performa, dan validasi reward'],
  ['subscription-pricing', 'Subscription plans', 'Harga multi-durasi, credits bulanan, dan reminder'],
  ['subscription-financials', 'Subscription finance', 'Kas, revenue diakui, kewajiban layanan, dan biaya AI'],
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

async function adminMutation<T>(path: string, method: 'PATCH' | 'POST', body?: unknown) {
  const token = getCurrentAuthToken()
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: buildApiHeaders({ additionalHeaders: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' } }),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = (await response.json()) as Payload<T>
  if (!response.ok) throw new Error(payload.message || 'Perubahan admin gagal disimpan.')
  return payload.data
}

function value(row: AdminRow, key: string) {
  const item = row[key]
  return typeof item === 'string' || typeof item === 'number' ? item : '—'
}

function AdminTable({ columns, rows, empty, onSelect, sortableKeys = [] }: { columns: Array<[string, string, (row: AdminRow) => ReactNode]>; rows: AdminRow[]; empty: string; onSelect?: (row: AdminRow) => void; sortableKeys?: string[] }) {
  const [sorting, setSorting] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const sortedRows = sorting ? [...rows].sort((a, b) => {
    const comparable = (row: AdminRow) => {
      const raw = row[sorting.key]
      if (raw == null || raw === '') return NaN
      return sorting.key === 'estimatedCostIdr' ? Number(raw) : typeof raw === 'string' ? Date.parse(raw) : NaN
    }
    const left = comparable(a)
    const right = comparable(b)
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0
    if (!Number.isFinite(right)) return -1
    return (left - right) * (sorting.direction === 'ascending' ? 1 : -1)
  }) : rows
  if (!rows.length) return <div className="panel admin-empty">{empty}</div>
  return <div className="panel admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(([key, title]) => <th key={key} scope="col" aria-sort={sortableKeys.includes(key) ? sorting?.key === key ? sorting.direction : 'none' : undefined}>{sortableKeys.includes(key) ? <button className="admin-sort-button" type="button" title="Urutkan data di halaman ini" onClick={() => setSorting((current) => ({ key, direction: current?.key === key && current.direction === 'descending' ? 'ascending' : 'descending' }))}>{title}<span aria-hidden="true">{sorting?.key === key ? sorting.direction === 'ascending' ? '↑' : '↓' : '↕'}</span></button> : title}</th>)}</tr></thead><tbody>{sortedRows.map((row, index) => <tr key={String(row.id ?? row.requestId ?? index)} onClick={onSelect ? () => onSelect(row) : undefined} onKeyDown={onSelect ? (event) => { if (event.key === 'Enter') onSelect(row) } : undefined} tabIndex={onSelect ? 0 : undefined} className={onSelect ? 'admin-table-row-clickable' : undefined}>{columns.map(([key, , render]) => <td key={key}>{render(row)}</td>)}</tr>)}</tbody></table></div>
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

function reportingWindow(days: number) {
  const end = new Date()
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

export function AdminDashboardPage({ onBackToUser, onLogout }: { onBackToUser: () => void; onLogout: () => Promise<void> }) {
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
  const [referralData, setReferralData] = useState<ReferralAdminData | null>(null)
  const [referralSaving, setReferralSaving] = useState(false)
  const [referralActionError, setReferralActionError] = useState('')
  const [subscriptionPricing, setSubscriptionPricing] = useState<SubscriptionPricingData | null>(null)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingActionError, setPricingActionError] = useState('')
  const [subscriptionFinancials, setSubscriptionFinancials] = useState<SubscriptionFinancials | null>(null)

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
      } else if (section === 'subscription-pricing') {
        const data = await adminRequest<SubscriptionPricingData>('/api/admin/subscription-pricing')
        setSubscriptionPricing(data || null)
      } else if (section === 'subscription-financials') {
        const range = isoRange(from, to)
        const params = new URLSearchParams()
        if (range.start) params.set('from', range.start)
        if (range.end) params.set('to', range.end)
        const data = await adminRequest<SubscriptionFinancials>(`/api/admin/subscription-financials?${params.toString()}`)
        setSubscriptionFinancials(data || null)
        setList({ items: data?.contracts || [], total: data?.contracts?.length || 0, page: 1, limit: 10000 })
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
          if (section === 'referrals') setReferralData(data as ReferralAdminData || null)
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

  const saveReferralSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!referralData) return
    setReferralSaving(true)
    setReferralActionError('')
    try {
      const form = new FormData(event.currentTarget)
      await adminMutation('/api/admin/referral-settings', 'PATCH', {
        enabled: form.get('enabled') === 'on', visible: form.get('visible') === 'on',
        referrerBonusCredits: Number(form.get('referrerBonusCredits')), referredBonusCredits: Number(form.get('referredBonusCredits')),
        attributionWindowDays: Number(form.get('attributionWindowDays')), validationDays: Number(form.get('validationDays')),
        rewardExpirationDays: Number(form.get('rewardExpirationDays')),
        eligiblePlanCodes: ['starter', 'creator', 'pro'].filter((item) => form.get(`plan-${item}`) === 'on'),
      })
      await load()
    } catch (actionError) { setReferralActionError(actionError instanceof Error ? actionError.message : 'Pengaturan referral gagal disimpan.') }
    finally { setReferralSaving(false) }
  }

  const rejectReferral = async (row: AdminRow) => {
    const reason = window.prompt('Alasan menolak referral ini (minimal 5 karakter):')
    if (!reason) return
    setReferralActionError('')
    try { await adminMutation(`/api/admin/referrals/${encodeURIComponent(String(row.id))}/reject`, 'POST', { reason }); await load() }
    catch (actionError) { setReferralActionError(actionError instanceof Error ? actionError.message : 'Referral gagal ditolak.') }
  }

  const processDueReferrals = async () => {
    setReferralActionError('')
    try { const result = await adminMutation<{ processed: number }>('/api/admin/referrals/process-due', 'POST'); window.alert(`${result?.processed || 0} referral diproses.`); await load() }
    catch (actionError) { setReferralActionError(actionError instanceof Error ? actionError.message : 'Reward referral gagal diproses.') }
  }

  const updatePricingDraft = (update: (draft: SubscriptionPricingConfig) => SubscriptionPricingConfig) => {
    setSubscriptionPricing((current) => current ? { ...current, draft: update(current.draft), impact: { ...current.impact, changed: true } } : current)
  }

  const savePricingDraft = async () => {
    if (!subscriptionPricing) return
    setPricingSaving(true); setPricingActionError('')
    try {
      const next = await adminMutation<SubscriptionPricingData>('/api/admin/subscription-pricing/draft', 'PATCH', { config: subscriptionPricing.draft })
      if (next) setSubscriptionPricing(next)
    } catch (actionError) { setPricingActionError(actionError instanceof Error ? actionError.message : 'Draft harga gagal disimpan.') }
    finally { setPricingSaving(false) }
  }

  const publishPricing = async () => {
    if (!subscriptionPricing || !window.confirm('Publikasikan harga dan jatah credits ini? Order baru akan langsung memakai konfigurasi terbaru.')) return
    setPricingSaving(true); setPricingActionError('')
    try {
      const next = await adminMutation<SubscriptionPricingData>('/api/admin/subscription-pricing/publish', 'POST')
      if (next) setSubscriptionPricing(next)
    } catch (actionError) { setPricingActionError(actionError instanceof Error ? actionError.message : 'Konfigurasi gagal dipublikasikan.') }
    finally { setPricingSaving(false) }
  }

  const columns: Array<[string, string, (row: AdminRow) => ReactNode]> = section === 'profitability' ? [
    ['user', 'User', (row) => <><strong>{value(row, 'full_name') || value(row, 'account_name')}</strong><small>{value(row, 'account_name')}</small></>],
    ['plan_name', 'Plan', (row) => value(row, 'plan_name')],
    ['acquisition_source', 'Acquisition', (row) => <><StatusBadge status={row.acquisition_source} />{row.referrer_user_id ? <small>Referral status: {String(row.referral_status || '').replaceAll('_', ' ')}</small> : null}</>],
    ['referral_credits_issued', 'Referral credits issued', (row) => formatNumber(row.referral_credits_issued)],
    ['referral_credits_available', 'Referral credits available', (row) => formatNumber(row.referral_credits_available)],
    ['referral_reward_cost_idr_estimate', 'Est. reward cost', (row) => formatCurrency(row.referral_reward_cost_idr_estimate)],
    ['subscription_cash_collected_idr', 'Subscription cash', (row) => formatCurrency(row.subscription_cash_collected_idr)],
    ['subscription_recognized_revenue_idr', 'Recognized revenue', (row) => formatCurrency(row.subscription_recognized_revenue_idr)],
    ['remaining_service_obligation_idr', 'Service obligation', (row) => formatCurrency(row.remaining_service_obligation_idr)],
    ['subscription_duration_months', 'Max term', (row) => row.subscription_duration_months ? `${value(row, 'subscription_duration_months')} mo` : '—'],
    ['monthly_credits_granted', 'Subscription credits', (row) => formatNumber(row.monthly_credits_granted)],
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
    ['created_at', 'Registered', (row) => formatDate(row.created_at)],
    ['lastLoginAt', 'Last Login', (row) => formatDate(row.lastLoginAt)],
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
  ] : section === 'feedback' ? [
    ['created_at', 'Submitted', (row) => formatDate(row.created_at)],
    ['user_name', 'User', (row) => <><strong>{value(row, 'user_name')}</strong><small>{value(row, 'user_email')}</small></>],
    ['message', 'Feedback', (row) => <span className="admin-feedback-preview">{String(row.message || '')}</span>],
    ['page_path', 'Page', (row) => value(row, 'page_path')],
  ] : section === 'referrals' ? [
    ['registeredAt', 'Terdaftar', (row) => formatDate(row.registeredAt)],
    ['referrer', 'Pengundang', (row) => <strong>{value(row, 'referrer')}</strong>],
    ['referred', 'Pengguna baru', (row) => <strong>{value(row, 'referred')}</strong>],
    ['referralCode', 'Kode', (row) => <code>{value(row, 'referralCode')}</code>],
    ['subscriptionPlan', 'Paket pertama', (row) => value(row, 'subscriptionPlan')],
    ['paymentStatus', 'Pembayaran', (row) => <StatusBadge status={row.paymentStatus} />],
    ['paymentAmountIdr', 'Nominal', (row) => row.paymentAmountIdr == null ? '—' : formatCurrency(row.paymentAmountIdr)],
    ['rewardStatus', 'Reward', (row) => <><StatusBadge status={row.rewardStatus} />{row.reviewRequired ? <small>Perlu ditinjau</small> : null}</>],
    ['rewardCredits', 'Bonus', (row) => row.rewardCredits ? `${formatNumber((row.rewardCredits as AdminRow).referrer)} / ${formatNumber((row.rewardCredits as AdminRow).referred)}` : '—'],
    ['action', 'Tindakan', (row) => ['registered', 'awaiting_payment', 'pending_validation'].includes(String(row.rewardStatus)) ? <button className="ghost-button" type="button" onClick={(event) => { event.stopPropagation(); void rejectReferral(row) }}>Tolak</button> : '—'],
  ] : section === 'subscription-financials' ? [
    ['user_name', 'User', (row) => <><strong>{value(row, 'user_name') || value(row, 'user_id')}</strong><small>{value(row, 'user_id')}</small></>],
    ['plan_name', 'Plan', (row) => value(row, 'plan_name')], ['duration_months', 'Duration', (row) => `${formatNumber(row.duration_months)} months`],
    ['payment_amount_idr', 'Cash paid', (row) => formatCurrency(row.payment_amount_idr)], ['paid_at', 'Paid at', (row) => formatDate(row.paid_at)],
    ['payment_status', 'Verification', (row) => <><StatusBadge status={row.payment_status} /><small>{value(row, 'payment_verification_source') || '—'}</small></>],
    ['starts_at', 'Service start', (row) => formatDate(row.starts_at)], ['ends_at', 'Service end', (row) => formatDate(row.ends_at)],
    ['monthly_credits', 'Credits / month', (row) => formatNumber(row.monthly_credits)], ['monthly_credits_granted', 'Credits granted', (row) => formatNumber(row.monthly_credits_granted)],
    ['credits_used', 'Credits used', (row) => formatNumber(row.credits_used)], ['total_tokens', 'Tokens', (row) => formatNumber(row.total_tokens)],
    ['actual_ai_cost_usd', 'Stored AI cost (USD)', (row) => `$${Number(row.actual_ai_cost_usd || 0).toFixed(4)}`],
    ['estimated_ai_cost_idr', 'Est. AI cost', (row) => formatEstimatedCostIdr(row.estimated_ai_cost_idr)],
    ['recognized_revenue_idr', 'Recognized revenue', (row) => formatCurrency(row.recognized_revenue_idr)],
    ['remaining_service_obligation_idr', 'Service obligation', (row) => formatCurrency(row.remaining_service_obligation_idr)],
    ['estimated_contribution_profit_idr', 'Est. contribution*', (row) => formatCurrency(row.estimated_contribution_profit_idr)],
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
          <button type="button" className="admin-nav-item admin-logout-button" onClick={() => void onLogout()}><strong>Logout</strong></button>
        </nav>
        <div className="admin-main">
          <header className="admin-section-heading"><div><p className="eyebrow">Operations</p><h2>{sections.find(([key]) => key === section)?.[1]}</h2></div><button className="ghost-button" type="button" onClick={() => void load()} disabled={loading}>Muat ulang</button></header>

          {section !== 'overview' && section !== 'audit-logs' && section !== 'subscription-pricing' && section !== 'subscription-financials' ? <div className="panel admin-filters">
            <label className="admin-search"><span className="sr-only">Cari</span><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value) }} placeholder={section === 'users' ? 'Cari nama atau account name' : section === 'error-logs' ? 'Cari kode error atau request ID' : section === 'feedback' ? 'Cari nama, email, atau feedback' : 'Cari user, order atau request'} /></label>
            {section === 'profitability' ? <>
              <label><span>Paket</span><select value={plan} onChange={(event) => { setPage(1); setPlan(event.target.value) }}><option value="">Semua paket</option>{['free', 'starter', 'creator', 'pro'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Urutkan</span><select value={sort} onChange={(event) => { setPage(1); setSort(event.target.value) }}>{[['highest_revenue','Revenue tertinggi'],['highest_ai_cost','Biaya AI tertinggi'],['highest_token_usage','Token tertinggi'],['highest_credit_usage','Kredit tertinggi'],['lowest_profit','Profit terendah'],['highest_profit','Profit tertinggi'],['negative_profit','Profit negatif']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            </> : null}
            {section !== 'users' && section !== 'profitability' && section !== 'feedback' ? <label><span>Status</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">Semua status</option>{(section === 'transactions' ? ['pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'] : section === 'ai-usage' ? ['success', 'failed'] : section === 'error-logs' ? ['500', '502', '503', '504', '599'] : section === 'referrals' ? ['awaiting_payment', 'pending_validation', 'rewarded', 'rejected', 'canceled'] : ['scheduled', 'processing', 'success', 'published', 'failed', 'uncertain', 'cancelled']).map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label> : null}
            {section !== 'users' ? <><label><span>Dari</span><input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value) }} /></label><label><span>Sampai</span><input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value) }} /></label></> : null}
          </div> : null}

          {loading ? <div className="panel admin-message" role="status">Memuat data…</div> : null}
          {!loading && error ? <div className="panel admin-message admin-message-error" role="alert">{error}</div> : null}
          {section === 'overview' ? <div className="panel admin-filters admin-date-presets"><div className="admin-range-presets"><button type="button" className="ghost-button" onClick={() => { const w = reportingWindow(1); setFrom(w.from); setTo(w.to) }}>Hari ini</button><button type="button" className="ghost-button" onClick={() => { const w = reportingWindow(7); setFrom(w.from); setTo(w.to) }}>7 hari</button><button type="button" className="ghost-button" onClick={() => { const w = reportingWindow(30); setFrom(w.from); setTo(w.to) }}>30 hari</button></div><label><span>Dari</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>Sampai</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div> : null}
          {!loading && !error && section === 'overview' && overview ? <>
            <div className="admin-metric-grid">{metricLabels.map(([key, label, description, kind]) => <article className="panel admin-metric-card" key={key}><span className="admin-metric-label">{label}</span><strong>{formatMetric(overview.metrics[key], kind)}</strong><small>{description}</small></article>)}</div>
            <div className="panel admin-data-note-box"><strong>Coverage dan kualitas data</strong><p>{overview.subscriptionFinancials?.setupRequired ? 'Migration multi-duration belum diterapkan; metrik keuangan subscription menampilkan nol sampai setup database selesai.' : overview.reportingSetupRequired ? 'Agregasi analytics belum tersedia sampai skrip admin_monitoring_setup.sql diterapkan ke database.' : 'Cash, revenue yang diakui, dan service obligation berasal dari kontrak subscription. Biaya AI IDR merupakan estimasi internal; pembayaran legacy tanpa kontrak dan refund yang tak tercatat tidak direkonstruksi.'}</p><span>Snapshot {formatDate(overview.generatedAt)}</span></div>
            {overview.trends ? <div className="admin-chart-grid"><TrendChart title="Revenue trend (top-ups only)" rows={overview.trends.daily || []} valueKey="revenueIdr" unit="currency" /><TrendChart title="AI cost trend (internal estimate)" rows={overview.trends.daily || []} valueKey="estimatedAiCostIdr" unit="currency" /><TrendChart title="Top-up revenue vs AI cost" rows={overview.trends.daily || []} valueKey="revenueIdr" compareKey="estimatedAiCostIdr" unit="currency" /><TrendChart title="User growth" rows={overview.trends.daily || []} valueKey="newUsers" /><SubscriptionFinanceSummary metrics={overview.subscriptionFinancials?.metrics} setupRequired={overview.subscriptionFinancials?.setupRequired} /><TrendChart title="AI usage by feature" rows={overview.trends.aiByFeature || []} valueKey="tokens" /></div> : null}
          </> : null}
          {section === 'profitability' && !loading && !error && list ? <p className="admin-data-note">* Kolom subscription memakai kontrak berbayar yang tercatat. Revenue yang diakui dialokasikan sepanjang layanan; biaya AI IDR tetap estimasi internal, refund dan gateway fees yang tidak tersimpan tidak direkonstruksi.</p> : null}
          {section === 'subscription-financials' && !loading && !error && subscriptionFinancials ? <>
            <div className="admin-metric-grid">{[['Kas subscription', subscriptionFinancials.metrics.subscriptionCashCollectedIdr], ['Revenue diakui', subscriptionFinancials.metrics.recognizedSubscriptionRevenueIdr], ['Service obligation', subscriptionFinancials.metrics.remainingServiceObligationIdr], ['Credits bulanan tercatat', subscriptionFinancials.metrics.monthlySubscriptionCreditsGranted], ['AI cost tersimpan (USD)', subscriptionFinancials.metrics.subscriptionActualAiCostUsd], ['Estimasi AI cost', subscriptionFinancials.metrics.subscriptionEstimatedAiCostIdr], ['Kontribusi estimasi', subscriptionFinancials.metrics.estimatedSubscriptionContributionIdr]].map(([label, value]) => <article className="panel admin-metric-card" key={String(label)}><span className="admin-metric-label">{String(label)}</span><strong>{String(label).includes('Credits') ? formatNumber(value) : String(label).includes('USD') ? `$${Number(value || 0).toFixed(4)}` : formatCurrency(value)}</strong></article>)}</div>
            <p className="admin-data-note">Revenue dialokasikan harian selama masa layanan; AI cost tersimpan berasal dari log aplikasi dan biaya IDR merupakan estimasi internal. Data pembayaran historis yang tidak memiliki subscription contract tidak direkonstruksi.</p>
          </> : null}
          {section === 'referrals' && !loading && !error && referralData ? <>
            <div className="admin-metric-grid">
              {[["Klik", referralData.metrics.referralClicks], ["Pendaftaran", referralData.metrics.registrations], ["Reward berhasil", referralData.metrics.successful], ["Menunggu validasi", referralData.metrics.pending], ["Ditolak", referralData.metrics.rejected], ["Kredit bonus", referralData.metrics.rewardCreditsGranted], ["Estimasi biaya kredit", formatCurrency(referralData.metrics.estimatedRewardCostIdr)], ["Konversi klik", `${formatNumber(referralData.metrics.conversionRate)}%`]].map(([label, metric]) => <article className="panel admin-metric-card" key={String(label)}><span className="admin-metric-label">{String(label)}</span><strong>{String(typeof metric === 'string' ? metric : formatNumber(metric))}</strong></article>)}
            </div>
            <form className="panel admin-filters admin-referral-settings" onSubmit={(event) => void saveReferralSettings(event)}>
              <h3>Pengaturan program referral</h3>
              <label className="admin-check-label"><input type="checkbox" name="enabled" defaultChecked={Boolean(referralData.config.enabled)} /> Program aktif</label>
              <label className="admin-check-label"><input type="checkbox" name="visible" defaultChecked={Boolean(referralData.config.visible)} /> Tampilkan referral di aplikasi</label>
              {[['referrerBonusCredits','Bonus pengundang'],['referredBonusCredits','Bonus pengguna baru'],['attributionWindowDays','Masa atribusi (hari)'],['validationDays','Masa validasi (hari)'],['rewardExpirationDays','Masa berlaku kredit (hari)']].map(([name,label]) => <label key={name}><span>{label}</span><input type="number" min={name.endsWith('Credits') ? 0 : 1} max={name.endsWith('Credits') ? 100000 : 365} name={name} defaultValue={Number(referralData.config[name])} required /></label>)}
              <fieldset><legend>Paket yang memenuhi syarat</legend>{['starter','creator','pro'].map((item) => <label className="admin-check-label" key={item}><input type="checkbox" name={`plan-${item}`} defaultChecked={(referralData.config.eligiblePlanCodes as string[] || []).includes(item)} /> {item}</label>)}</fieldset>
              <button className="primary-button" type="submit" disabled={referralSaving}>{referralSaving ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
              <button className="ghost-button" type="button" onClick={() => void processDueReferrals()}>Proses reward yang jatuh tempo</button>
            </form>
            <p className="admin-data-note">Estimasi biaya reward memakai perkiraan internal Rp50 per AI Credit. Kredit referral berlaku untuk penggunaan AI dan tidak membuka fitur paket berbayar.</p>
            {referralActionError ? <div className="panel admin-message admin-message-error" role="alert">{referralActionError}</div> : null}
          </> : null}
          {section === 'subscription-pricing' && !loading && !error && subscriptionPricing ? <section className="panel admin-pricing-editor">
            <div className="admin-pricing-summary"><div><p className="eyebrow">Versi live {subscriptionPricing.version}</p><h3>Harga paket dan jatah bulanan</h3><p>Perubahan draft belum dipakai user sampai dipublikasikan. Order baru akan menyimpan snapshot harga dan versi konfigurasi saat dibuat.</p></div><span className={`admin-status ${subscriptionPricing.impact.changed ? 'pending' : 'success'}`}>{subscriptionPricing.impact.changed ? 'Draft berubah' : 'Draft sama dengan live'}</span></div>
            <div className="admin-pricing-global">
              <label><span>Durasi default</span><select value={subscriptionPricing.draft.defaultDurationMonths} onChange={(event) => updatePricingDraft((draft) => ({ ...draft, defaultDurationMonths: Number(event.target.value) }))}>{[1, 3, 12].filter((month) => subscriptionPricing.draft.enabledDurations.includes(month)).map((month) => <option key={month} value={month}>{month === 12 ? '1 tahun' : `${month} bulan`}</option>)}</select></label>
              <fieldset><legend>Durasi yang tersedia</legend>{[1, 3, 12].map((month) => <label className="admin-check-label" key={month}><input type="checkbox" checked={subscriptionPricing.draft.enabledDurations.includes(month)} onChange={(event) => updatePricingDraft((draft) => ({ ...draft, enabledDurations: event.target.checked ? [...draft.enabledDurations, month].sort((a,b)=>a-b) : draft.enabledDurations.filter((value) => value !== month) }))} /> {month === 12 ? '1 tahun' : `${month} bulan`}</label>)}</fieldset>
            </div>
            <div className="admin-plan-pricing-grid">{['starter', 'creator', 'pro'].map((code) => {
              const plan = subscriptionPricing.draft.plans[code]
              if (!plan) return null
              return <article className="admin-plan-pricing-card" key={code}><h4>{code[0].toUpperCase() + code.slice(1)}</h4><label><span>AI Credits / bulan</span><input type="number" min="1" max="100000" value={plan.monthlyAiCredits} onChange={(event) => updatePricingDraft((draft) => ({ ...draft, plans: { ...draft.plans, [code]: { ...draft.plans[code], monthlyAiCredits: Number(event.target.value) } } }))} /></label><div className="admin-prices-grid">{[1, 3, 12].map((month) => <label key={month}><span>{month === 12 ? '12 bulan' : `${month} bulan`} · total dibayar</span><input type="number" min="500" step="500" value={plan.prices[String(month)]} onChange={(event) => updatePricingDraft((draft) => ({ ...draft, plans: { ...draft.plans, [code]: { ...draft.plans[code], prices: { ...draft.plans[code].prices, [String(month)]: Number(event.target.value) } } } }))} /></label>)}</div></article>
            })}</div>
            <fieldset className="admin-reminder-options"><legend>Reminder masa aktif berakhir</legend>{[7, 3, 1].map((days) => <label className="admin-check-label" key={days}><input type="checkbox" checked={subscriptionPricing.draft.expiryReminderDays.includes(days)} onChange={(event) => updatePricingDraft((draft) => ({ ...draft, expiryReminderDays: event.target.checked ? [...draft.expiryReminderDays, days].sort((a,b)=>b-a) : draft.expiryReminderDays.filter((value) => value !== days) }))} /> {days} hari sebelumnya</label>)}</fieldset>
            <div className="admin-impact-preview"><strong>Impact preview</strong><span>{subscriptionPricing.impact.changed ? `Publish akan membuat konfigurasi versi ${subscriptionPricing.impact.proposedVersion} berlaku untuk order baru.` : `Konfigurasi live versi ${subscriptionPricing.version} tetap berlaku.`}</span><small>Pembayaran lama, harga snapshot, dan periode credits yang sudah dibuat tidak berubah. Perubahan paket di tengah masa aktif dibatasi; renewal paket yang sama diperbolehkan.</small></div>
            {pricingActionError ? <div className="panel admin-message admin-message-error" role="alert">{pricingActionError}</div> : null}
            <div className="admin-pricing-actions"><button className="ghost-button" type="button" disabled={pricingSaving} onClick={() => void savePricingDraft()}>{pricingSaving ? 'Menyimpan…' : 'Save Draft'}</button><button className="primary-button" type="button" disabled={pricingSaving || !subscriptionPricing.impact.changed} onClick={() => void publishPricing()}>{pricingSaving ? 'Memproses…' : 'Publish'}</button></div>
            <p className="admin-data-note">Durasi berbayar ditagih sekali melalui QRIS. AI Credits selalu diberikan per bulan dan kredit top-up maupun referral tetap mengikuti aturan expiry masing-masing.</p>
          </section> : null}
          {!loading && !error && section === 'users' && selectedUserId && userDetail ? <UserDetailView detail={userDetail} onBack={() => { setSelectedUserId(''); setUserDetail(null) }} /> : null}
          {!loading && !error && section !== 'overview' && section !== 'subscription-pricing' && list && !(section === 'users' && selectedUserId) ? <>
            <AdminTable key={section} columns={columns} rows={list.items} sortableKeys={section === 'users' ? ['created_at', 'lastLoginAt'] : section === 'ai-usage' ? ['estimatedCostIdr'] : section === 'scheduled-posts' || section === 'feedback' ? ['created_at'] : []} empty={section === 'error-logs' ? 'Belum ada error server yang tercatat.' : section === 'feedback' ? 'Belum ada feedback dari pengguna.' : 'Belum ada data untuk filter ini.'} onSelect={section === 'users' ? openUser : undefined} />
            {list.truncated ? <p className="admin-data-note">Daftar users dibatasi pada 100.000 profil untuk menjaga penggunaan database.</p> : null}
            <div className="admin-pagination"><span>{formatNumber(list.total)} records</span><div><button className="ghost-button" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Sebelumnya</button><span>Halaman {page}</span><button className="ghost-button" type="button" onClick={() => setPage((current) => current + 1)} disabled={page * list.limit >= list.total}>Berikutnya</button></div></div>
          </> : null}
          {section === 'error-logs' && !loading && !error ? <p className="admin-data-note">Log mencakup error API/server berstatus 5xx. Body request, kredensial, dan stack trace tidak disimpan.</p> : null}
        </div>
      </div>
    </section>
  )
}

function SubscriptionFinanceSummary({ metrics, setupRequired }: { metrics?: AdminRow; setupRequired?: boolean }) {
  return <article className="panel admin-chart-card">
    <div className="admin-chart-heading"><div><strong>Subscription finance</strong><span>Kontrak layanan terverifikasi</span></div></div>
    {setupRequired ? <p className="admin-data-note">Migration subscription finance belum diterapkan.</p> : <div className="admin-metric-grid">
      <div><span className="admin-metric-label">Kas terkumpul</span><strong>{formatCurrency(metrics?.subscriptionCashCollectedIdr)}</strong></div>
      <div><span className="admin-metric-label">Revenue diakui</span><strong>{formatCurrency(metrics?.recognizedSubscriptionRevenueIdr)}</strong></div>
      <div><span className="admin-metric-label">Kewajiban layanan</span><strong>{formatCurrency(metrics?.remainingServiceObligationIdr)}</strong></div>
    </div>}
    <p className="admin-data-note">Lihat rincian kontrak di menu Subscription finance.</p>
  </article>
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
    <p className="admin-data-note">* Revenue subscription memakai kontrak berbayar yang tercatat dan dialokasikan sepanjang masa layanan. Biaya AI IDR merupakan estimasi internal; refund dan gateway fees yang tidak tersimpan tidak direkonstruksi.</p>
    <div className="admin-user-history-grid">
      <section><h3>AI requests terbaru</h3><AdminTable columns={miniColumns([['created_at','Waktu',(row)=>formatDate(row.created_at)],['feature','Fitur',(row)=>value(row,'feature')],['model','Model',(row)=>value(row,'model')],['total_tokens','Token',(row)=>formatNumber(row.total_tokens)],['status','Status',(row)=><StatusBadge status={row.status}/>]])} rows={ai} empty="Belum ada riwayat AI." /></section>
      <section><h3>Transaksi terbaru</h3><AdminTable columns={miniColumns([['created_at','Waktu',(row)=>formatDate(row.paid_at || row.created_at)],['amount_idr','Nominal',(row)=>formatCurrency(row.amount_idr)],['provider','Provider',(row)=>value(row,'provider')],['status','Status',(row)=><StatusBadge status={row.status}/>]])} rows={payments} empty="Belum ada transaksi." /></section>
      <section><h3>Perubahan kredit terbaru</h3><AdminTable columns={miniColumns([['created_at','Waktu',(row)=>formatDate(row.created_at)],['transaction_type','Jenis',(row)=>value(row,'transaction_type')],['credits_delta','Perubahan',(row)=>formatNumber(row.credits_delta)],['balance_after','Saldo',(row)=>formatNumber(row.balance_after)]])} rows={creditsHistory} empty="Belum ada transaksi kredit." /></section>
      <section><h3>Post terjadwal terbaru</h3><AdminTable columns={miniColumns([['scheduled_at','Waktu',(row)=>formatDate(row.scheduled_at)],['status','Status',(row)=><StatusBadge status={row.status}/>],['retry_count','Retry',(row)=>formatNumber(row.retry_count)]])} rows={posts} empty="Belum ada jadwal post." /></section>
    </div>
  </section>
}
