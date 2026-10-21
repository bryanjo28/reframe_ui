import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { listContentOutputs, type ContentOutputRecord } from '../services/contentOutputs'
import { listPersonaConfigs, type PersonaConfigRecord } from '../services/personaConfigs'
import { cancelThreadsContentSchedule, rescheduleThreadsContent, scheduleThreadsAutoPost } from '../services/threadsAutoPost'
import type { ThreadsConnectionStatus } from '../services/authService'
import { getThreadsErrorAction } from '../utils/threadsErrors'
import type { UiLanguage } from '../utils/uiLanguage'

type Props = { userId: string; threadsStatus: ThreadsConnectionStatus; onConnectThreads: () => void; onReviewContent?: () => void; language: UiLanguage }
type View = 'calendar' | 'list'
const TZ = 'Asia/Jakarta'
const WEEKDAYS: Record<UiLanguage, string[]> = { id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }

function valueOf(record: Record<string, unknown> | null, keys: string[]) { if (!record) return ''; for (const key of keys) { const value = record[key]; if (typeof value === 'string' && value.trim()) return value.trim() } return '' }
function outputId(record: ContentOutputRecord) { return valueOf(record, ['id']) }
function personaId(record: ContentOutputRecord) { return valueOf(record, ['personaConfigId', 'persona_config_id']) }
function titleOf(record: ContentOutputRecord) { return valueOf(record, ['title', 'topic', 'content', 'contentOutput', 'output']).slice(0, 110) || 'Konten tanpa judul' }
function scheduledValue(record: ContentOutputRecord) { return valueOf(record, ['scheduledAt', 'scheduled_at']) }
function publishJobId(record: ContentOutputRecord) { return valueOf(record, ['publishScheduledJobId', 'publish_scheduled_job_id']) }
function personaName(record: PersonaConfigRecord | undefined) { return valueOf(record || null, ['persona', 'title', 'name']) || 'Persona' }
function isPosted(record: ContentOutputRecord) { return ['posted', 'published'].includes(String(record.status || '').toLowerCase()) || Boolean(valueOf(record, ['externalPostId', 'external_post_id'])) }
function isActuallyScheduled(record: ContentOutputRecord) { return String(record.status || '').toLowerCase() === 'approved' && String(record.platform || '').toLowerCase() === 'threads' && Boolean(scheduledValue(record)) && Boolean(publishJobId(record)) && !isPosted(record) }
function isReady(record: ContentOutputRecord) { return String(record.status || '').toLowerCase() === 'approved' && String(record.platform || '').toLowerCase() === 'threads' && !isActuallyScheduled(record) && !isPosted(record) }
function dateKey(date: Date) { const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const g = (t: string) => p.find((x) => x.type === t)?.value || ''; return `${g('year')}-${g('month')}-${g('day')}` }
function parseDate(record: ContentOutputRecord) { const date = new Date(scheduledValue(record)); return Number.isNaN(date.getTime()) ? null : date }
function wibIso(date: string, time: string) { const parsed = new Date(`${date}T${time}:00+07:00`); return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString() }
function monthLabel(date: Date, language: UiLanguage) { return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric', timeZone: TZ }).format(date) }
function dayLabel(date: Date, language: UiLanguage) { return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(date) }
function timeLabel(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TZ,
  }).formatToParts(date)
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value
  return hour && minute ? `${hour}:${minute}` : ''
}
function shortDate(date: Date, language: UiLanguage) { return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', timeZone: TZ }).format(date) }
function listGroup(date: Date, today: Date, language: UiLanguage) { const target = dateKey(date); const current = dateKey(today); const tomorrow = dateKey(new Date(today.getTime() + 86_400_000)); if (target === current) return language === 'en' ? 'TODAY' : 'HARI INI'; if (target === tomorrow) return language === 'en' ? 'TOMORROW' : 'BESOK'; return shortDate(date, language).toUpperCase() }
function cellsFor(month: Date) { const y = month.getFullYear(); const m = month.getMonth(); const leading = (new Date(y, m, 1).getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate(); return [...Array.from({ length: leading }, (_, i) => ({ key: `b${i}`, date: null })), ...Array.from({ length: days }, (_, i) => ({ key: `${y}-${m}-${i}`, date: new Date(y, m, i + 1) }))] }

export function AutoPostPage({ userId, threadsStatus, onConnectThreads, onReviewContent, language }: Props) {
  const { success, error } = useToast()
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState<View>('calendar')
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today))
  const [outputs, setOutputs] = useState<ContentOutputRecord[]>([])
  const [personas, setPersonas] = useState<PersonaConfigRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editing, setEditing] = useState<ContentOutputRecord | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<ContentOutputRecord | null>(null)
  const [date, setDate] = useState(dateKey(today))
  const [time, setTime] = useState('18:00')
  const [saving, setSaving] = useState(false)
  const [scheduleError, setScheduleError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [content, configs] = await Promise.all([listContentOutputs(userId || undefined), listPersonaConfigs()])
      setOutputs(content); setPersonas(configs)
    } catch { error('Data jadwal belum termuat', 'Coba muat ulang halaman.') }
    finally { setLoading(false) }
  }, [error, userId])
  useEffect(() => { void refresh() }, [refresh])

  const ready = useMemo(() => outputs.filter(isReady), [outputs])
  const scheduled = useMemo(() => outputs.filter(isActuallyScheduled).map((item) => ({ item, date: parseDate(item) })).filter((x): x is { item: ContentOutputRecord; date: Date } => Boolean(x.date)).sort((a, b) => a.date.getTime() - b.date.getTime()), [outputs])
  const grouped = useMemo(() => { const map = new Map<string, typeof scheduled>(); scheduled.forEach((row) => map.set(dateKey(row.date), [...(map.get(dateKey(row.date)) || []), row])); return map }, [scheduled])
  const selectedDay = grouped.get(selectedDate) || []
  const personaFor = (record: ContentOutputRecord) => personaName(personas.find((p) => p.id === personaId(record)))
  const selectedContents = ready.filter((item) => selectedIds.includes(outputId(item)))
  const selectedContent = selectedContents[0] || null

  const isThreadsConnected = threadsStatus === 'connected'
  function openNew(prefillDate?: string) { if (!isThreadsConnected) { onConnectThreads(); return } const next = new Date(Math.ceil((Date.now() + 5 * 60_000) / 60_000) * 60_000); setDate(prefillDate || dateKey(next)); setTime(timeLabel(next)); setScheduleError(''); setEditing(null); setShowSchedule(true) }
  function openEdit(record: ContentOutputRecord) { const parsed = parseDate(record); if (!parsed || isPosted(record)) return; setScheduleError(''); setEditing(record); setDate(dateKey(parsed)); setTime(timeLabel(parsed)); setShowSchedule(true) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setScheduleError('')
    const iso = wibIso(date, time)
    if (!iso || !date || !time || dateKey(new Date(iso)) !== date || timeLabel(new Date(iso)) !== time) {
      setScheduleError('Pilih tanggal dan waktu jadwal yang valid (WIB).')
      return
    }
    if (new Date(iso).getTime() <= Date.now()) {
      setScheduleError('Jadwal harus setelah waktu sekarang (WIB). Pilih waktu yang lebih akhir.')
      return
    }
    if (!isThreadsConnected) { setScheduleError('Hubungkan kembali akun Threads sebelum menjadwalkan konten.'); return }
    if (!editing && !selectedContents.length) { setScheduleError('Pilih konten yang ingin dijadwalkan.'); return }
    setSaving(true)
    try {
      if (editing) {
        await rescheduleThreadsContent(outputId(editing), iso)
        setSelectedIds([])
        success('Jadwal diperbarui', `${time} WIB`)
      } else {
        const results = await Promise.allSettled(selectedContents.map((item) => scheduleThreadsAutoPost({ contentOutputId: outputId(item), scheduledAt: iso })))
        const failedIds = selectedContents.filter((_, index) => results[index].status === 'rejected').map(outputId)
        const successCount = results.length - failedIds.length
        setSelectedIds(failedIds)
        if (failedIds.length) {
          const firstFailure = results.find((result) => result.status === 'rejected')
          const action = getThreadsErrorAction(firstFailure?.status === 'rejected' ? firstFailure.reason : null)
          const message = `${successCount} berhasil, ${failedIds.length} gagal. ${action.message}`
          setScheduleError(message)
          error('Jadwal belum tersimpan', message)
          if (action.action === 'reconnect' || action.action === 'connect') onConnectThreads()
          await refresh()
          return
        }
        else success(`${successCount} konten dijadwalkan`, `${time} WIB`)
      }
      await refresh()
      setShowSchedule(false)
      setSelectedDate(date)
      setMonth(new Date(`${date}T12:00:00`))
    } catch (cause) {
      const action = getThreadsErrorAction(cause)
      setScheduleError(action.message)
      error('Jadwal belum tersimpan', action.message)
      if (action.action === 'reconnect' || action.action === 'connect') onConnectThreads()
    }
    finally { setSaving(false) }
  }
  async function cancelSchedule() {
    if (!cancelTarget) return
    setSaving(true)
    try {
      await cancelThreadsContentSchedule(outputId(cancelTarget))
      await refresh()
      setCancelTarget(null)
      success('Jadwal dibatalkan', 'Konten kembali ke Belum dijadwalkan.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Coba lagi.'
      const isAlreadyUnscheduled = /not currently scheduled|scheduled content not found/i.test(message)

      if (isAlreadyUnscheduled) {
        await refresh()
        setCancelTarget(null)
        success('Jadwal sudah dibatalkan', 'Daftar jadwal telah disinkronkan kembali.')
      } else {
        error('Jadwal belum dibatalkan', message)
      }
    } finally {
      setSaving(false)
    }
  }

  return <section className="generate-page auto-post-page schedule-workspace schedule-page">
    <header className="schedule-page-header"><div><h1>Jadwal</h1><p>Atur konten yang akan tayang dan kapan waktunya.</p></div></header>
    {!isThreadsConnected ? <div className="schedule-message error"><AppIcon name="info" /><span>{threadsStatus === 'needs_reconnect' ? 'Koneksi Threads telah kedaluwarsa. Hubungkan kembali akun Anda.' : 'Hubungkan Threads untuk membuat jadwal baru.'}</span><button className="schedule-text-button" onClick={onConnectThreads}>{threadsStatus === 'needs_reconnect' ? 'Hubungkan Ulang Threads' : 'Hubungkan Threads'}</button></div> : null}
    <nav className="schedule-main-tabs"><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Kalender</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List <span>{scheduled.length}</span></button></nav>

    <div className={`schedule-content-workspace${view === 'list' ? ' schedule-list-only' : ''}`}><main>
      {view === 'calendar' ? <><div className="schedule-calendar-toolbar"><div className="schedule-month-nav"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><h2>{monthLabel(month, language)}</h2><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div><button className="schedule-text-button" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(dateKey(today)) }}>Hari ini</button></div><div className="schedule-calendar"><div className="schedule-weekdays">{WEEKDAYS[language].map((day) => <span key={day}>{day}</span>)}</div><div className="schedule-month-grid">{cellsFor(month).map(({ key, date: cellDate }) => { if (!cellDate) return <span className="schedule-day blank" key={key} />; const keyDate = dateKey(cellDate); const events = grouped.get(keyDate) || []; return <button key={key} className={`schedule-day${selectedDate === keyDate ? ' selected' : ''}${dateKey(today) === keyDate ? ' today' : ''}`} onClick={() => setSelectedDate(keyDate)}><span className="day-number">{cellDate.getDate()}</span>{events.slice(0, 2).map(({ item, date: eventDate }) => <span className="calendar-event" key={outputId(item)} onClick={(event) => { event.stopPropagation(); openEdit(item) }}><b>{timeLabel(eventDate)}</b> {titleOf(item)}</span>)}{events.length > 2 ? <small>+{events.length - 2} lainnya</small> : null}{events.length ? <i className="schedule-dot" /> : null}</button> })}</div></div><section className="schedule-day-agenda"><div className="agenda-heading"><div><span>Agenda</span><h3>{dayLabel(new Date(`${selectedDate}T12:00:00`), language)}</h3></div></div>{selectedDay.length ? <div className="agenda-list">{selectedDay.map(({ item, date: itemDate }) => <article key={outputId(item)} onClick={() => openEdit(item)}><time>{timeLabel(itemDate)}</time><div><strong>{titleOf(item)}</strong><span>{personaFor(item)}</span></div><button className="schedule-row-menu" aria-label="Edit jadwal">•••</button></article>)}</div> : <div className="schedule-empty compact"><strong>Belum ada konten terjadwal.</strong></div>}</section></> : <div className="schedule-list-view">{scheduled.length ? scheduled.map(({ item, date: itemDate }, index) => { const heading = listGroup(itemDate, today, language); const previous = index ? listGroup(scheduled[index - 1].date, today, language) : ''; return <Fragment key={outputId(item)}>{heading !== previous ? <h3 className="schedule-list-group">{heading}</h3> : null}<article onClick={() => openEdit(item)}><time><b>{timeLabel(itemDate)}</b><span>WIB</span></time><div><strong>{titleOf(item)}</strong><span>{personaFor(item)}</span></div><button className="schedule-row-menu" aria-label="Edit jadwal">•••</button></article></Fragment> }) : <div className="schedule-empty"><strong>Belum ada konten terjadwal</strong><p>Konten yang kamu jadwalkan akan muncul di sini.</p></div>}</div>}
    </main>{view === 'calendar' ? <aside className="schedule-unscheduled"><div className="schedule-ready-head"><div><h2>Belum dijadwalkan</h2><p>{ready.length} konten</p></div></div>{loading ? <div className="schedule-empty compact">Memuat konten...</div> : ready.length ? <div className="schedule-ready-list">{ready.map((item) => { const id = outputId(item); const active = selectedIds.includes(id); return <button className={active ? 'selected' : ''} key={id} onClick={() => setSelectedIds((current) => active ? current.filter((value) => value !== id) : [...current, id])}><span className="idea-check">{active ? '✓' : ''}</span><div><strong>{titleOf(item)}</strong><span>{personaFor(item)} · Siap</span></div></button> })}</div> : <div className="schedule-empty compact"><strong>Belum ada konten yang siap dijadwalkan</strong><p>Review dan approve konten terlebih dahulu.</p>{onReviewContent ? <button className="schedule-text-button" onClick={onReviewContent}>Review Konten</button> : null}</div>}{selectedContents.length ? <div className="schedule-ready-action"><span>{selectedContents.length} konten dipilih</span><button className="schedule-primary" onClick={() => openNew()}>Pilih waktu</button></div> : null}</aside> : null}</div>

    {showSchedule ? <div className="schedule-dialog-backdrop"><section className="schedule-dialog" role="dialog" aria-modal="true"><header><div><h2>{editing ? 'Edit jadwal' : 'Jadwalkan konten'}</h2><p>{editing ? titleOf(editing) : selectedContents.length > 1 ? `${selectedContents.length} konten terpilih` : titleOf(selectedContent!)}</p></div><button aria-label="Tutup" onClick={() => setShowSchedule(false)}>×</button></header><form onSubmit={submit} noValidate><div className="schedule-date-time"><label><span>Tanggal</span><input type="date" value={date} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(e) => setDate(e.target.value)} /></label><label><span>Waktu (WIB)</span><input type="time" value={time} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(e) => setTime(e.target.value)} /></label></div>{scheduleError ? <p className="schedule-inline-warning" role="alert">{scheduleError}</p> : null}<div className="schedule-dialog-actions"><button className="ghost-button" type="button" onClick={() => setShowSchedule(false)}>Batal</button><button className="schedule-primary schedule-submit" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan' : `Jadwalkan ${selectedContents.length} konten`}</button></div>{editing && onReviewContent ? <button className="schedule-view-action" type="button" onClick={onReviewContent}>Lihat konten</button> : null}{editing ? <button className="schedule-cancel-action" type="button" onClick={() => { setShowSchedule(false); setCancelTarget(editing) }}>Batalkan jadwal</button> : null}</form></section></div> : null}
    {cancelTarget ? <div className="schedule-dialog-backdrop"><section className="schedule-dialog schedule-confirm" role="alertdialog"><header><div><h2>Batalkan jadwal?</h2><p>Konten tidak akan dihapus dan bisa dijadwalkan kembali.</p></div></header><div className="schedule-confirm-actions"><button className="ghost-button" onClick={() => setCancelTarget(null)}>Batal</button><button className="danger-button" disabled={saving} onClick={() => void cancelSchedule()}>{saving ? 'Membatalkan...' : 'Batalkan Jadwal'}</button></div></section></div> : null}
  </section>
}
