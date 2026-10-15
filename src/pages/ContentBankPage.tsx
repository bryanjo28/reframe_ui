import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { deleteContentOutput, listContentOutputs, listPublishedPosts, retryContentOutputPost, updateContentOutput, type ContentOutputRecord, type PublishedPostRecord } from '../services/contentOutputs'
import type { NavKey } from '../types/navigation'
import { getUserFacingError } from '../utils/apiError'
import { getThreadsErrorAction } from '../utils/threadsErrors'

type Filter = 'all' | 'review' | 'ready' | 'scheduled' | 'failed' | 'published'
const threadSplitMarker = '---THREAD_SPLIT---'

function splitThreadContent(content: string) {
  return content.split(/\s*---THREAD_SPLIT---\s*/g).map((part) => part.trim())
}

function joinThreadContent(parts: string[]) {
  return parts.map((part) => part.trim()).join(`\n\n${threadSplitMarker}\n\n`)
}

function valueOf(record: ContentOutputRecord | null, keys: string[]) {
  if (!record) return ''
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function outputId(record: ContentOutputRecord) { return valueOf(record, ['id']) }
function outputContent(record: ContentOutputRecord | null) { return valueOf(record, ['content', 'contentText', 'content_text', 'contentOutput', 'content_output', 'output', 'result']) || 'Konten belum tersedia.' }
function outputTitle(record: ContentOutputRecord) { return valueOf(record, ['title', 'topic']) || outputContent(record).slice(0, 82) }
function outputDate(record: ContentOutputRecord) { return valueOf(record, ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'generatedAt', 'generated_at']) }
function scheduledAt(record: ContentOutputRecord) { return valueOf(record, ['scheduledAt', 'scheduled_at']) }
function publishJobId(record: ContentOutputRecord) { return valueOf(record, ['publishScheduledJobId', 'publish_scheduled_job_id']) }
function isPublished(record: ContentOutputRecord) { return ['posted', 'published'].includes(String(record.status || '').toLowerCase()) || Boolean(valueOf(record, ['externalPostId', 'external_post_id'])) }
function stateOf(record: ContentOutputRecord): Exclude<Filter, 'all'> { const status = String(record.status || '').toLowerCase(); if (isPublished(record)) return 'published'; if (status === 'failed') return 'failed'; if (status !== 'approved') return 'review'; return scheduledAt(record) && publishJobId(record) ? 'scheduled' : 'ready' }
function labelOf(record: ContentOutputRecord) { return ({ review: 'Perlu Review', ready: 'Siap Dijadwalkan', scheduled: 'Terjadwal', failed: 'Gagal', published: 'Published' } as const)[stateOf(record)] }
function canRetryOutput(record: ContentOutputRecord) { return String(record.status || '').toLowerCase() === 'failed' && String(record.platform || '').toLowerCase() === 'threads' }
function formatDate(value: string) { if (!value) return ''; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed) }

export function ContentBankPage({ userId, onNavigate }: { userId: string; onNavigate: (page: NavKey) => void }) {
  const { success, error } = useToast()
  const [outputs, setOutputs] = useState<ContentOutputRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('review')
  const [query, setQuery] = useState('')
  const [reviewing, setReviewing] = useState<ContentOutputRecord | null>(null)
  const [draftParts, setDraftParts] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [approvingId, setApprovingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [deleteConfirming, setDeleteConfirming] = useState<ContentOutputRecord | null>(null)
  const [retrying, setRetrying] = useState<ContentOutputRecord | null>(null)
  const [retryScheduleAt, setRetryScheduleAt] = useState('')
  const [isRetrying, setIsRetrying] = useState(false)
  const [publishedViewing, setPublishedViewing] = useState<ContentOutputRecord | null>(null)
  const [titleViewing, setTitleViewing] = useState<ContentOutputRecord | null>(null)
  const [publishedPosts, setPublishedPosts] = useState<PublishedPostRecord[]>([])
  const [publishedLoading, setPublishedLoading] = useState(false)
  const [publishedError, setPublishedError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setOutputs(await listContentOutputs(userId || undefined)) }
    catch (cause) { setOutputs([]); error('Content Bank belum termuat', getUserFacingError(cause)) }
    finally { setLoading(false) }
  }, [error, userId])

  useEffect(() => { void refresh() }, [refresh])

  const counts = useMemo(() => {
    const result: Record<Exclude<Filter, 'all'>, number> = { review: 0, ready: 0, scheduled: 0, failed: 0, published: 0 }
    outputs.forEach((item) => { result[stateOf(item)] += 1 })
    return result
  }, [outputs])
  const visible = useMemo(() => outputs.filter((item) => {
    if (filter !== 'all' && stateOf(item) !== filter) return false
    const needle = query.trim().toLowerCase()
    return !needle || `${outputTitle(item)} ${outputContent(item)} ${item.platform || ''}`.toLowerCase().includes(needle)
  }), [filter, outputs, query])

  function openReview(item: ContentOutputRecord) {
    if (isPublished(item)) { void openPublished(item); return }
    setReviewing(item)
    setDraftParts(splitThreadContent(outputContent(item)))
  }
  async function saveReview() {
    const content = joinThreadContent(draftParts)
    if (!reviewing || !outputId(reviewing) || !content.trim()) return
    setSaving(true)
    try {
      await updateContentOutput(outputId(reviewing), { content, status: String(reviewing.status || 'draft') })
      await refresh(); setReviewing(null)
      success('Perubahan disimpan', 'Draft berhasil diperbarui.')
    } catch (cause) { error('Konten belum tersimpan', getUserFacingError(cause)) }
    finally { setSaving(false) }
  }

  async function approveContent(item: ContentOutputRecord) {
    const id = outputId(item)
    if (!id) return
    setApprovingId(id)
    try {
      await updateContentOutput(id, { content: outputContent(item), status: 'approved' })
      await refresh()
      success('Konten siap dijadwalkan', 'Konten sudah disetujui.')
    } catch (cause) { error('Konten belum disetujui', getUserFacingError(cause)) }
    finally { setApprovingId('') }
  }

  async function confirmDeleteOutput() {
    const item = deleteConfirming
    if (!item) return
    const id = outputId(item)
    if (!id || isPublished(item)) return

    setDeletingId(id)
    try {
      await deleteContentOutput(id)
      setOutputs((current) => current.filter((output) => outputId(output) !== id))
      if (outputId(reviewing || {}) === id) setReviewing(null)
      setDeleteConfirming(null)
      success('Output dihapus', 'Output berhasil dihapus.')
    } catch (cause) {
      error('Output belum terhapus', getUserFacingError(cause))
    } finally {
      setDeletingId('')
    }
  }

  const canSubmitRetry = Boolean(retrying && canRetryOutput(retrying) && retryScheduleAt && !Number.isNaN(Date.parse(retryScheduleAt)) && !isRetrying)

  async function submitRetry(event: FormEvent) {
    event.preventDefault()
    if (!retrying || !canSubmitRetry) return
    setIsRetrying(true)
    try {
      await retryContentOutputPost({ contentOutputId: outputId(retrying), scheduledAt: new Date(retryScheduleAt).toISOString() })
      await refresh()
      setRetrying(null)
      setRetryScheduleAt('')
      setFilter('scheduled')
      success('Retry dijadwalkan', 'Konten akan diposting ulang sesuai jadwal baru.')
    } catch (cause) {
      const action = getThreadsErrorAction(cause)
      error('Retry belum dijadwalkan', action.message)
      if (action.action === 'reconnect' || action.action === 'connect') onNavigate('connecting-apps')
    } finally {
      setIsRetrying(false)
    }
  }

  async function openPublished(item: ContentOutputRecord) {
    const id = outputId(item)
    if (!id) return
    setPublishedViewing(item)
    setPublishedPosts([])
    setPublishedError('')
    setPublishedLoading(true)
    try {
      setPublishedPosts((await listPublishedPosts(id)).filter((post) => {
        try { return ['http:', 'https:'].includes(new URL(post.postUrl).protocol) } catch { return false }
      }).sort((first, second) => first.sequenceNumber - second.sequenceNumber).slice(0, 1))
    } catch (cause) {
      setPublishedError(getUserFacingError(cause))
    } finally {
      setPublishedLoading(false)
    }
  }

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'review', label: 'Perlu Review', count: counts.review },
    { key: 'ready', label: 'Siap', count: counts.ready },
    { key: 'scheduled', label: 'Terjadwal', count: counts.scheduled },
    { key: 'failed', label: 'Gagal', count: counts.failed },
    { key: 'published', label: 'Published', count: counts.published },
  ]

  return <section className="content-bank-page">
    <header className="content-bank-header"><div><p className="eyebrow">Workspace</p><h1>Content Bank</h1><p>Simpan, review, dan siapkan seluruh kontenmu dari satu tempat.</p></div></header>
    <div className="content-bank-toolbar"><div className="content-bank-search"><AppIcon name="search" /><input aria-label="Cari konten" placeholder="Cari konten..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="content-bank-filters">{filters.map((item) => <button key={item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.label}<span>{item.count}</span></button>)}</div></div>
    {loading ? <div className="content-bank-empty"><strong>Memuat Content Bank...</strong></div> : visible.length ? <div className="content-bank-list">{visible.map((item) => { const state = stateOf(item); const id = outputId(item); const title = outputTitle(item); return <article key={id}><div className={`content-bank-status ${state}`}>{labelOf(item)}</div><div className="content-bank-copy"><button type="button" className="content-bank-title-button" title={title} onClick={() => setTitleViewing(item)}>{title}</button><p>{outputContent(item)}</p><span>{String(item.platform || 'Threads')} · {formatDate(outputDate(item)) || 'Baru dibuat'}</span></div><div className="content-bank-actions">{state === 'review' ? <><button className="primary-button compact" onClick={() => openReview(item)}>Review</button><button className="primary-button compact approve" disabled={approvingId === id} onClick={() => void approveContent(item)}><AppIcon name="check" />{approvingId === id ? 'Menyetujui...' : 'Setujui'}</button></> : state === 'ready' ? <button className="primary-button compact" onClick={() => onNavigate('auto-post')}>Jadwalkan</button> : state === 'scheduled' ? <button className="ghost-button compact" onClick={() => onNavigate('auto-post')}>Lihat Jadwal</button> : state === 'failed' && canRetryOutput(item) ? <button className="primary-button compact" onClick={() => { setRetrying(item); setRetryScheduleAt('') }}>Retry</button> : <button className="ghost-button compact" onClick={() => openReview(item)}>Lihat</button>}{state !== 'published' ? <button type="button" className="ghost-button compact content-bank-delete" aria-label={`Hapus output ${title}`} title="Hapus output" disabled={deletingId === id} onClick={() => setDeleteConfirming(item)}><AppIcon name="trash" />{deletingId === id ? 'Menghapus...' : 'Hapus'}</button> : null}</div></article> })}</div> : <div className="content-bank-empty"><AppIcon name="layers" /><strong>{query ? 'Konten tidak ditemukan' : filter === 'all' ? 'Content Bank masih kosong' : `Belum ada konten ${filters.find((item) => item.key === filter)?.label.toLowerCase()}`}</strong><p>{query ? 'Coba kata kunci atau filter lain.' : 'Buat konten baru untuk mulai mengisi Content Bank.'}</p>{!query && filter === 'all' ? <button className="primary-button" onClick={() => onNavigate('create')}>Buat Konten</button> : null}</div>}
    {titleViewing ? <div className="content-bank-dialog-backdrop content-bank-title-backdrop" onClick={() => setTitleViewing(null)}><section className="content-bank-dialog content-bank-title-dialog" role="dialog" aria-modal="true" aria-labelledby="content-bank-title-dialog-heading" onClick={(event) => event.stopPropagation()}><header><div><p className="eyebrow">{labelOf(titleViewing)}</p><h2 id="content-bank-title-dialog-heading">Judul konten</h2></div><button type="button" aria-label="Tutup" onClick={() => setTitleViewing(null)}>×</button></header><div className="content-bank-title-full"><p>{outputTitle(titleViewing)}</p><button type="button" className="primary-button" onClick={() => setTitleViewing(null)}>Tutup</button></div></section></div> : null}
    {reviewing ? <div className="content-bank-dialog-backdrop"><section className="content-bank-dialog" role="dialog" aria-modal="true" aria-label="Review konten"><header><div><p className="eyebrow">Review Konten</p><h2>{outputTitle(reviewing)}</h2></div><button aria-label="Tutup" onClick={() => setReviewing(null)}>×</button></header><form onSubmit={(event: FormEvent) => { event.preventDefault(); void saveReview() }}><div className="content-bank-thread-editor"><div className="content-bank-thread-heading"><span>Isi Threads</span><small>{draftParts.length} bagian</small></div><div className="content-output-thread-list">{draftParts.map((part, index) => <label className="content-output-thread-card" key={index}><span className="content-output-thread-card-head"><strong>Thread {index + 1}</strong><small>{part.length} karakter</small></span><textarea aria-label={`Thread ${index + 1}`} value={part} onChange={(event) => setDraftParts((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} rows={5} placeholder={`Tulis isi Thread ${index + 1}...`} /></label>)}</div></div><div className="content-bank-dialog-actions"><button type="button" className="ghost-button" onClick={() => setReviewing(null)}>Batal</button><button className="primary-button" disabled={saving || !joinThreadContent(draftParts).trim()}>{saving ? 'Menyimpan...' : 'Simpan'}</button></div></form></section></div> : null}
    {retrying ? <div className="schedule-dialog-backdrop content-bank-retry-backdrop" onClick={() => { if (!isRetrying) setRetrying(null) }}><section className="schedule-dialog content-bank-retry-dialog" role="dialog" aria-modal="true" aria-labelledby="content-bank-retry-title" onClick={(event) => event.stopPropagation()}><header><div><h2 id="content-bank-retry-title">Jadwalkan retry</h2><p>{outputTitle(retrying)}</p></div><button type="button" aria-label="Tutup" disabled={isRetrying} onClick={() => setRetrying(null)}>×</button></header><form onSubmit={submitRetry}><label><span>Jadwal retry</span><input type="datetime-local" aria-label="Jadwal retry" value={retryScheduleAt} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => setRetryScheduleAt(event.target.value)} /></label><small>Pilih tanggal dan waktu baru untuk mencoba posting kembali.</small><div className="schedule-dialog-actions"><button type="button" className="ghost-button" disabled={isRetrying} onClick={() => setRetrying(null)}>Batal</button><button className="schedule-primary schedule-submit" disabled={!canSubmitRetry}>{isRetrying ? 'Menjadwalkan...' : 'Jadwalkan retry'}</button></div></form></section></div> : null}
    {publishedViewing ? <div className="content-bank-dialog-backdrop content-bank-published-backdrop"><section className="content-bank-dialog content-bank-published-dialog" role="dialog" aria-modal="true" aria-label="Konten terbit"><header><div><p className="eyebrow">Konten Terbit</p><h2>{outputTitle(publishedViewing)}</h2></div><button aria-label="Tutup" onClick={() => setPublishedViewing(null)}>×</button></header><div className="published-post-links">{publishedLoading ? <p>Memuat link publikasi...</p> : publishedError ? <p className="form-error">{publishedError}</p> : publishedPosts.length ? publishedPosts.map((post) => <a className="primary-button published-post-link" key={`${post.postUrl}-${post.sequenceNumber}`} href={post.postUrl} target="_blank" rel="noopener noreferrer">Lihat post di Threads</a>) : <p>Link publikasi belum tersedia.</p>}</div></section></div> : null}
    {deleteConfirming ? <div className="content-bank-dialog-backdrop content-bank-delete-backdrop"><section className="content-bank-dialog content-bank-delete-dialog" role="dialog" aria-modal="true" aria-label="Konfirmasi hapus konten"><header><div><p className="eyebrow">Hapus Konten</p><h2>{outputTitle(deleteConfirming)}</h2></div><button aria-label="Tutup" disabled={Boolean(deletingId)} onClick={() => setDeleteConfirming(null)}>×</button></header><div className="content-bank-delete-confirmation"><p>Apakah Anda yakin ingin menghapus konten ini? Tindakan ini tidak dapat dibatalkan.</p><div><button type="button" className="ghost-button" disabled={Boolean(deletingId)} onClick={() => setDeleteConfirming(null)}>Batal</button><button type="button" className="danger-button" disabled={Boolean(deletingId)} onClick={() => void confirmDeleteOutput()}>{deletingId ? 'Menghapus...' : 'Hapus'}</button></div></div></section></div> : null}
  </section>
}
