import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { deleteContentOutput, listContentOutputs, updateContentOutput, type ContentOutputRecord } from '../services/contentOutputs'
import type { NavKey } from '../types/navigation'
import { getUserFacingError } from '../utils/apiError'

type Filter = 'all' | 'review' | 'ready' | 'scheduled' | 'published'
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
function stateOf(record: ContentOutputRecord): Exclude<Filter, 'all'> { const status = String(record.status || '').toLowerCase(); if (isPublished(record)) return 'published'; if (status !== 'approved') return 'review'; return scheduledAt(record) && publishJobId(record) ? 'scheduled' : 'ready' }
function labelOf(record: ContentOutputRecord) { return ({ review: 'Perlu Review', ready: 'Siap Dijadwalkan', scheduled: 'Terjadwal', published: 'Published' } as const)[stateOf(record)] }
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

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setOutputs(await listContentOutputs(userId || undefined)) }
    catch (cause) { setOutputs([]); error('Content Bank belum termuat', getUserFacingError(cause)) }
    finally { setLoading(false) }
  }, [error, userId])

  useEffect(() => { void refresh() }, [refresh])

  const counts = useMemo(() => {
    const result: Record<Exclude<Filter, 'all'>, number> = { review: 0, ready: 0, scheduled: 0, published: 0 }
    outputs.forEach((item) => { result[stateOf(item)] += 1 })
    return result
  }, [outputs])
  const visible = useMemo(() => outputs.filter((item) => {
    if (filter !== 'all' && stateOf(item) !== filter) return false
    const needle = query.trim().toLowerCase()
    return !needle || `${outputTitle(item)} ${outputContent(item)} ${item.platform || ''}`.toLowerCase().includes(needle)
  }), [filter, outputs, query])

  function openReview(item: ContentOutputRecord) { setReviewing(item); setDraftParts(splitThreadContent(outputContent(item))) }
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

  async function deleteOutput(item: ContentOutputRecord) {
    const id = outputId(item)
    if (!id || isPublished(item)) return
    if (!window.confirm(`Hapus output "${outputTitle(item)}"?`)) return

    setDeletingId(id)
    try {
      await deleteContentOutput(id)
      setOutputs((current) => current.filter((output) => outputId(output) !== id))
      if (outputId(reviewing || {}) === id) setReviewing(null)
      success('Output dihapus', 'Output berhasil dihapus.')
    } catch (cause) {
      error('Output belum terhapus', getUserFacingError(cause))
    } finally {
      setDeletingId('')
    }
  }

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'review', label: 'Perlu Review', count: counts.review },
    { key: 'ready', label: 'Siap', count: counts.ready },
    { key: 'scheduled', label: 'Terjadwal', count: counts.scheduled },
    { key: 'published', label: 'Published', count: counts.published },
  ]

  return <section className="content-bank-page">
    <header className="content-bank-header"><div><p className="eyebrow">Workspace</p><h1>Content Bank</h1><p>Simpan, review, dan siapkan seluruh kontenmu dari satu tempat.</p></div></header>
    <div className="content-bank-toolbar"><div className="content-bank-search"><AppIcon name="search" /><input aria-label="Cari konten" placeholder="Cari konten..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="content-bank-filters">{filters.map((item) => <button key={item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.label}<span>{item.count}</span></button>)}</div></div>
    {loading ? <div className="content-bank-empty"><strong>Memuat Content Bank...</strong></div> : visible.length ? <div className="content-bank-list">{visible.map((item) => { const state = stateOf(item); const id = outputId(item); const title = outputTitle(item); return <article key={id}><div className={`content-bank-status ${state}`}>{labelOf(item)}</div><div className="content-bank-copy"><strong>{title}</strong><p>{outputContent(item)}</p><span>{String(item.platform || 'Threads')} · {formatDate(outputDate(item)) || 'Baru dibuat'}</span></div><div className="content-bank-actions">{state === 'review' ? <><button className="primary-button compact" onClick={() => openReview(item)}>Review</button><button className="primary-button compact approve" disabled={approvingId === id} onClick={() => void approveContent(item)}><AppIcon name="check" />{approvingId === id ? 'Menyetujui...' : 'Setujui'}</button></> : state === 'ready' ? <button className="primary-button compact" onClick={() => onNavigate('auto-post')}>Jadwalkan</button> : state === 'scheduled' ? <button className="ghost-button compact" onClick={() => onNavigate('auto-post')}>Lihat Jadwal</button> : <button className="ghost-button compact" onClick={() => openReview(item)}>Lihat</button>}{state !== 'published' ? <button type="button" className="ghost-button compact content-bank-delete" aria-label={`Hapus output ${title}`} title="Hapus output" disabled={deletingId === id} onClick={() => void deleteOutput(item)}><AppIcon name="trash" />{deletingId === id ? 'Menghapus...' : 'Hapus'}</button> : null}</div></article> })}</div> : <div className="content-bank-empty"><AppIcon name="layers" /><strong>{query ? 'Konten tidak ditemukan' : filter === 'all' ? 'Content Bank masih kosong' : `Belum ada konten ${filters.find((item) => item.key === filter)?.label.toLowerCase()}`}</strong><p>{query ? 'Coba kata kunci atau filter lain.' : 'Buat konten baru untuk mulai mengisi Content Bank.'}</p>{!query && filter === 'all' ? <button className="primary-button" onClick={() => onNavigate('create')}>Buat Konten</button> : null}</div>}
    {reviewing ? <div className="content-bank-dialog-backdrop"><section className="content-bank-dialog" role="dialog" aria-modal="true" aria-label="Review konten"><header><div><p className="eyebrow">Review Konten</p><h2>{outputTitle(reviewing)}</h2></div><button aria-label="Tutup" onClick={() => setReviewing(null)}>×</button></header><form onSubmit={(event: FormEvent) => { event.preventDefault(); void saveReview() }}><div className="content-bank-thread-editor"><div className="content-bank-thread-heading"><span>Isi Threads</span><small>{draftParts.length} bagian</small></div><div className="content-output-thread-list">{draftParts.map((part, index) => <label className="content-output-thread-card" key={index}><span className="content-output-thread-card-head"><strong>Thread {index + 1}</strong><small>{part.length} karakter</small></span><textarea aria-label={`Thread ${index + 1}`} value={part} onChange={(event) => setDraftParts((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} rows={5} placeholder={`Tulis isi Thread ${index + 1}...`} /></label>)}</div></div><div className="content-bank-dialog-actions"><button type="button" className="ghost-button" onClick={() => setReviewing(null)}>Batal</button><button className="primary-button" disabled={saving || !joinThreadContent(draftParts).trim()}>{saving ? 'Menyimpan...' : 'Simpan'}</button></div></form></section></div> : null}
  </section>
}
