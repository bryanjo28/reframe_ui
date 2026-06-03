import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { listContentOutputs, type ContentOutputRecord } from '../services/contentOutputs'
import { listPersonaConfigs, type PersonaConfigRecord } from '../services/personaConfigs'
import { runThreadsAutoPost, scheduleThreadsAutoPost } from '../services/threadsAutoPost'

type AutoPostPageProps = {
  userId: string
}

type AutoPostScheduleForm = {
  personaConfigId: string
  limit: number
  scheduledAt: string
}

function getRecordValue(record: PersonaConfigRecord | null, keys: string[]) {
  if (!record) {
    return ''
  }

  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function getRecordUserId(record: PersonaConfigRecord | null) {
  return getRecordValue(record, [
    'userId',
    'user_id',
    'ownerId',
    'owner_id',
    'createdByUserId',
    'created_by_user_id',
  ])
}

function getPersonaLabel(record: PersonaConfigRecord) {
  return (
    getRecordValue(record, ['persona']) ||
    getRecordValue(record, ['title']) ||
    getRecordValue(record, ['name']) ||
    'Untitled persona'
  )
}

function getPersonaMeta(record: PersonaConfigRecord) {
  const platform = getRecordValue(record, ['platform'])
  const audience = getRecordValue(record, ['targetAudience', 'target_audience'])
  const style = getRecordValue(record, ['contentStyle', 'content_style'])

  return [platform, audience, style].filter(Boolean).join(' - ') || 'Belum ada ringkasan persona'
}

function normalizeDatetimeLocal(value: string) {
  if (!value.trim()) {
    return ''
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString()
}

function buildPreviewPayload(form: AutoPostScheduleForm) {
  return {
    personaConfigId: form.personaConfigId,
    limit: form.limit,
    scheduledAt: normalizeDatetimeLocal(form.scheduledAt),
  }
}

function isApprovedOutput(record: ContentOutputRecord): boolean {
  return record.status?.toLowerCase().trim() === 'approved'
}

function getOutputPreviewText(record: ContentOutputRecord): string {
  return (
    record.content ||
    record.contentOutput ||
    record.output ||
    record.topic ||
    record.title ||
    'Konten tidak tersedia'
  )
}

export function AutoPostPage({ userId }: AutoPostPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [personaConfigs, setPersonaConfigs] = useState<PersonaConfigRecord[]>([])
  const [contentOutputs, setContentOutputs] = useState<ContentOutputRecord[]>([])
  const [form, setForm] = useState<AutoPostScheduleForm>({
    personaConfigId: '',
    limit: 5,
    scheduledAt: '',
  })
  const [statusMessage, setStatusMessage] = useState(
    'Pilih persona lalu atur limit dan waktu schedule.',
  )
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)
  const [isLoadingOutputs, setIsLoadingOutputs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadPersonaConfigs() {
      setIsLoadingPersonas(true)

      try {
        const records = await listPersonaConfigs()
        const ownedRecords = userId
          ? records.filter((record) => {
              const ownerId = getRecordUserId(record)
              return !ownerId || ownerId === userId
            })
          : records

        if (!isMounted) {
          return
        }

        setPersonaConfigs(ownedRecords)
        setForm((current) => ({
          ...current,
          personaConfigId: current.personaConfigId || ownedRecords[0]?.id || '',
        }))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPersonaConfigs([])
        setForm((current) => ({
          ...current,
          personaConfigId: '',
        }))
        const errorMessage = error instanceof Error ? error.message : 'Gagal memuat persona configs.'
        setStatusTone('error')
        setStatusMessage(errorMessage)
      } finally {
        if (isMounted) {
          setIsLoadingPersonas(false)
        }
      }
    }

    void loadPersonaConfigs()

    return () => {
      isMounted = false
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    async function loadContentOutputs() {
      setIsLoadingOutputs(true)

      try {
        const records = await listContentOutputs(userId || undefined)

        if (!isMounted) {
          return
        }

        setContentOutputs(records)
      } catch {
        if (isMounted) {
          setContentOutputs([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingOutputs(false)
        }
      }
    }

    void loadContentOutputs()

    return () => {
      isMounted = false
    }
  }, [userId])

  const selectedPersona = useMemo(
    () => personaConfigs.find((persona) => persona.id === form.personaConfigId) || null,
    [form.personaConfigId, personaConfigs],
  )

  const approvedOutputs = useMemo(
    () => contentOutputs.filter(isApprovedOutput),
    [contentOutputs],
  )

  const unapprovedCount = contentOutputs.length - approvedOutputs.length

  const previewQueue = useMemo(
    () => approvedOutputs.slice(0, form.limit),
    [approvedOutputs, form.limit],
  )

  const canSubmit =
    Boolean(form.personaConfigId.trim()) &&
    form.limit >= 1 &&
    form.limit <= 100 &&
    Boolean(form.scheduledAt.trim()) &&
    !isSubmitting &&
    !isLoadingPersonas

  const previewPayload = useMemo(() => buildPreviewPayload(form), [form])

  function updateForm(key: keyof AutoPostScheduleForm, value: string | number) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const scheduledAtIso = normalizeDatetimeLocal(form.scheduledAt)

    if (!form.personaConfigId.trim() || !scheduledAtIso || form.limit < 1) {
      setStatusTone('error')
      setStatusMessage('Lengkapi persona, limit, dan scheduled time dulu.')
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage('Mengirim schedule auto post...')

    const payload = {
      personaConfigId: form.personaConfigId.trim(),
      limit: form.limit,
      scheduledAt: scheduledAtIso,
    }

    console.log('[AutoPost] submitting payload', payload)
    console.log('[AutoPost] approved outputs before schedule', approvedOutputs.map((r) => ({
      id: r.id,
      status: r.status,
      scheduled_at: r.scheduled_at || r.scheduledAt,
    })))

    try {
      const response = await scheduleThreadsAutoPost(payload)

      console.log('[AutoPost] scheduleThreadsAutoPost response', response)
      console.log('[AutoPost] scheduled_at sent →', scheduledAtIso)
      setStatusTone('success')
      setStatusMessage('Auto post berhasil dijadwalkan.')
      toastSuccess('Schedule sent', 'Request auto post sudah dikirim ke backend.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menjadwalkan auto post.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Schedule failed', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRunNow() {
    setIsRunning(true)

    try {
      const response = await runThreadsAutoPost()
      console.log('[AutoPost] runThreadsAutoPost response', response)
      toastSuccess('Job triggered', 'Auto post job berhasil dijalankan manual.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menjalankan auto post job.'
      toastError('Run job failed', errorMessage)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="generate-page auto-post-page">
      <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Auto Post</p>
          <h1>Schedule auto post.</h1>
          <p className="page-description">
            Pilih persona, tentukan limit konten yang mau di-schedule, lalu set waktu postingnya.
            Hanya konten berstatus <strong>approved</strong> yang akan ikut batch.
          </p>
        </div>

        <div className="generate-hero-metrics">
          <div className="metric-card">
            <span>Flow</span>
            <strong>Threads auto post</strong>
          </div>
          <div className="metric-card">
            <span>Persona</span>
            <strong>{selectedPersona ? getPersonaLabel(selectedPersona) : 'Not selected'}</strong>
          </div>
          <div className="metric-card">
            <span>Approved</span>
            <strong>
              {isLoadingOutputs ? '...' : `${approvedOutputs.length} / ${contentOutputs.length}`}
            </strong>
          </div>
        </div>
      </header>

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <AppIcon name={statusTone === 'success' ? 'check' : 'info'} />
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className="generate-layout auto-post-layout">
        <form className="panel generate-panel auto-post-form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Schedule Form</p>
              <h2>Isi data auto post</h2>
            </div>
            <span className={`pill${canSubmit ? ' subtle' : ''}`}>{canSubmit ? 'Ready' : 'Needs input'}</span>
          </div>

          <label className="persona-field full-width">
            <span>Persona Config</span>
            <div className="select-wrap">
              <select
                value={form.personaConfigId}
                onChange={(event) => updateForm('personaConfigId', event.target.value)}
                disabled={isLoadingPersonas || personaConfigs.length === 0}
              >
                <option value="">
                  {isLoadingPersonas ? 'Loading persona configs...' : 'Choose persona'}
                </option>
                {personaConfigs.map((persona) => (
                  <option key={persona.id || getPersonaLabel(persona)} value={persona.id || ''}>
                    {getPersonaLabel(persona)}
                  </option>
                ))}
              </select>
            </div>
          </label>

          {selectedPersona ? (
            <div className="generate-empty-state auto-post-now-note">
              <AppIcon name="user" />
              <div>
                <strong>{getPersonaLabel(selectedPersona)}</strong>
                <p>{getPersonaMeta(selectedPersona)}</p>
              </div>
            </div>
          ) : (
            <div className="generate-empty-state auto-post-now-note">
              <AppIcon name="info" />
              <div>
                <strong>Belum ada persona</strong>
                <p>Pilih persona config dulu supaya schedule bisa dikirim ke backend.</p>
              </div>
            </div>
          )}

          <label className="persona-field">
            <span>Limit</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.limit}
              onChange={(event) =>
                updateForm('limit', Number.parseInt(event.target.value || '0', 10) || 1)
              }
              placeholder="5"
            />
            <small className="field-hint">Jumlah konten yang akan masuk batch schedule.</small>
          </label>

          <label className="persona-field full-width">
            <span>Scheduled At</span>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => updateForm('scheduledAt', event.target.value)}
            />
            <small className="field-hint">Pilih tanggal dan jam posting.</small>
          </label>

          <div className="persona-actions persona-actions-preview">
            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Menjadwalkan...' : 'Schedule'}
            </button>
          </div>
        </form>

        <aside className="generate-side-column auto-post-side-column">
          <article className="panel generate-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Approved Content</p>
                <h2>Preview antrian post</h2>
              </div>
              <span className="pill subtle">approved only</span>
            </div>

            <div className="integration-note">
              <AppIcon name="info" />
              <p>
                Hanya konten berstatus <strong>approved</strong> yang akan ikut batch auto post.
                {unapprovedCount > 0 && !isLoadingOutputs
                  ? ` ${unapprovedCount} konten lain belum approved dan tidak akan ikut.`
                  : null}
              </p>
            </div>

            {isLoadingOutputs ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Memuat content outputs...</strong>
                </div>
              </div>
            ) : approvedOutputs.length === 0 ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Tidak ada konten approved</strong>
                  <p>Approve konten di Content Engine dulu sebelum schedule auto post.</p>
                </div>
              </div>
            ) : (
              <div className="auto-post-output-list">
                {previewQueue.map((record, index) => (
                  <div key={record.id || index} className="auto-post-output-item">
                    <div className="auto-post-output-meta">
                      <span className="pill subtle">#{index + 1}</span>
                      <span className="pill">approved</span>
                    </div>
                    <p className="auto-post-output-text">
                      {getOutputPreviewText(record).slice(0, 120)}
                      {getOutputPreviewText(record).length > 120 ? '…' : ''}
                    </p>
                  </div>
                ))}
                {approvedOutputs.length > form.limit ? (
                  <p className="field-hint" style={{ textAlign: 'center', marginTop: '8px' }}>
                    +{approvedOutputs.length - form.limit} konten approved lain tidak masuk limit ini.
                  </p>
                ) : null}
              </div>
            )}
          </article>

          <article className="panel generate-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Preview</p>
                <h2>Payload ke backend</h2>
              </div>
              <span className="pill subtle">POST /api/threads/auto-post</span>
            </div>

            <div className="generate-summary auto-post-summary">
              <div className="generate-summary-item">
                <span>Persona Config ID</span>
                <strong>{form.personaConfigId || 'Belum diisi'}</strong>
              </div>
              <div className="generate-summary-item">
                <span>Limit</span>
                <strong>{form.limit}</strong>
              </div>
              <div className="generate-summary-item">
                <span>Scheduled At</span>
                <strong>{form.scheduledAt || 'Belum diisi'}</strong>
              </div>
            </div>

            <label className="persona-field full-width">
              <span>Preview Payload</span>
              <textarea
                value={JSON.stringify(previewPayload, null, 2)}
                readOnly
                rows={8}
                className="generate-preview-textarea"
              />
            </label>

            <div className="auto-post-run-section">
              <p className="field-hint">
                Run Job memicu auto post secara manual — biasanya dijalankan otomatis oleh
                backend/cron. Gunakan hanya untuk debug.
              </p>
              <button
                type="button"
                className="secondary-button auto-post-run-btn"
                onClick={handleRunNow}
                disabled={isRunning}
              >
                <AppIcon name="arrow-right" />
                {isRunning ? 'Running...' : 'Run Job'}
              </button>
            </div>
          </article>
        </aside>
      </section>
    </section>
  )
}
