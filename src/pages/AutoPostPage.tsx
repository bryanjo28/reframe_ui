import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { listContentOutputs, type ContentOutputRecord } from '../services/contentOutputs'
import { listPersonaConfigs, type PersonaConfigRecord } from '../services/personaConfigs'
import {
  getScheduledJobById,
  scheduleThreadsAutoPost,
  type ScheduledJobRecord,
} from '../services/threadsAutoPost'

type AutoPostPageProps = {
  userId: string
}

type AutoPostScheduleForm = {
  personaConfigId: string
  targetCount: number
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

function getScheduledJobValue(record: ScheduledJobRecord | null, keys: string[]) {
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

function getScheduledJobId(record: ScheduledJobRecord | null) {
  return getScheduledJobValue(record, ['id'])
}

function getScheduledJobUserId(record: ScheduledJobRecord | null) {
  return getScheduledJobValue(record, ['userId', 'user_id'])
}

function getScheduledJobStatus(record: ScheduledJobRecord | null) {
  return getScheduledJobValue(record, ['status']) || 'registered'
}

function getScheduledJobDate(record: ScheduledJobRecord | null) {
  return getScheduledJobValue(record, ['scheduledAt', 'scheduled_at'])
}

function readScheduledJobIdFromResponse(response: unknown) {
  if (!response || typeof response !== 'object') {
    return ''
  }

  const candidates = [
    response,
    (response as Record<string, unknown>).data,
    (response as Record<string, unknown>).item,
    (response as Record<string, unknown>).scheduledJob,
    (response as Record<string, unknown>).scheduled_job,
  ]

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue
    }

    const value = (candidate as Record<string, unknown>).id

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
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

function isApprovedOutput(record: ContentOutputRecord): boolean {
  return record.status?.toLowerCase().trim() === 'approved'
}

function isThreadsPlatform(record: ContentOutputRecord): boolean {
  return record.platform?.toLowerCase().trim() === 'threads'
}

function getOutputPersonaConfigId(record: ContentOutputRecord): string {
  const candidates = [record.personaConfigId, record.persona_config_id]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return ''
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
    targetCount: 5,
    scheduledAt: '',
  })
  const [statusMessage, setStatusMessage] = useState(
    'Pilih persona lalu atur target dan waktu schedule.',
  )
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)
  const [isLoadingOutputs, setIsLoadingOutputs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredScheduleCount, setRegisteredScheduleCount] = useState(0)
  const [latestScheduledJob, setLatestScheduledJob] = useState<ScheduledJobRecord | null>(null)

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

  const personaScopedOutputs = useMemo(() => {
    if (!form.personaConfigId.trim()) {
      return []
    }

    return contentOutputs.filter((record) => {
      return getOutputPersonaConfigId(record) === form.personaConfigId.trim()
    })
  }, [contentOutputs, form.personaConfigId])

  const approvedOutputs = useMemo(() => {
    return personaScopedOutputs.filter((record) => {
      return isApprovedOutput(record) && isThreadsPlatform(record)
    })
  }, [personaScopedOutputs])

  const excludedOutputCount = Math.max(personaScopedOutputs.length - approvedOutputs.length, 0)

  const previewQueue = useMemo(
    () => approvedOutputs.slice(0, form.targetCount),
    [approvedOutputs, form.targetCount],
  )

  const canSubmit =
    Boolean(form.personaConfigId.trim()) &&
    form.targetCount >= 1 &&
    form.targetCount <= 100 &&
    Boolean(form.scheduledAt.trim()) &&
    previewQueue.length > 0 &&
    !isSubmitting &&
    !isLoadingPersonas

  function updateForm(key: keyof AutoPostScheduleForm, value: string | number) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const scheduledAtIso = normalizeDatetimeLocal(form.scheduledAt)

    if (!form.personaConfigId.trim() || !scheduledAtIso || form.targetCount < 1) {
      setStatusTone('error')
      setStatusMessage('Lengkapi persona, target, dan scheduled time dulu.')
      return
    }

    if (!previewQueue[0]?.id) {
      setStatusTone('error')
      setStatusMessage('Belum ada approved content Threads untuk persona ini.')
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage('Mengirim schedule auto post...')

    const payload = {
      personaConfigId: form.personaConfigId.trim(),
      scheduledAt: scheduledAtIso,
      limit: form.targetCount,
    }

    console.log('[AutoPost] submitting payload', payload)
    console.log(
      '[AutoPost] approved outputs before schedule',
      approvedOutputs.map((record) => ({
        id: record.id,
        status: record.status,
        platform: record.platform,
        personaConfigId: getOutputPersonaConfigId(record),
        scheduled_at: record.scheduled_at || record.scheduledAt,
      })),
    )

    try {
      const response = await scheduleThreadsAutoPost(payload)
      const scheduledJobId = readScheduledJobIdFromResponse(response)

      console.log('[AutoPost] scheduleThreadsAutoPost response', response)
      console.log('[AutoPost] scheduleValue sent ->', scheduledAtIso)

      if (scheduledJobId) {
        try {
          const scheduledJob = await getScheduledJobById(scheduledJobId)

          console.log('[AutoPost] getScheduledJobById response', scheduledJob)
          setLatestScheduledJob(scheduledJob)

          if (!userId || !getScheduledJobUserId(scheduledJob) || getScheduledJobUserId(scheduledJob) === userId) {
            setRegisteredScheduleCount((current) => current + 1)
          }
        } catch (scheduledJobError) {
          console.log('[AutoPost] getScheduledJobById failed', scheduledJobError)
          setLatestScheduledJob({
            id: scheduledJobId,
            scheduledAt: scheduledAtIso,
            status: 'registered',
          })
          setRegisteredScheduleCount((current) => current + 1)
        }
      } else {
        setLatestScheduledJob({
          scheduledAt: scheduledAtIso,
          status: 'registered',
        })
        setRegisteredScheduleCount((current) => current + 1)
      }

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

  return (
    <section className="generate-page auto-post-page">
      <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Auto Post</p>
          <h1>Schedule auto post.</h1>
          <p className="page-description">
            Pilih persona, tentukan target konten approved yang mau di-schedule, lalu set waktu postingnya.
            Hanya konten berstatus <strong>approved</strong> yang akan ikut batch.
          </p>
        </div>

        <div className="generate-hero-metrics pt-2">
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
              {isLoadingOutputs ? '...' : `${approvedOutputs.length} / ${personaScopedOutputs.length}`}
            </strong>
          </div>
          <div className="metric-card">
            <span>Auto post terdaftar</span>
            <strong>{registeredScheduleCount}x</strong>
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
            <span className={`pill${canSubmit ? ' subtle' : ''}`}>
              {canSubmit ? 'Ready' : 'Needs input'}
            </span>
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
            <span>Target</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.targetCount}
              onChange={(event) =>
                updateForm('targetCount', Number.parseInt(event.target.value || '0', 10) || 1)
              }
              placeholder="5"
            />
            <small className="field-hint">Jumlah konten approved yang akan diambil untuk batch auto post.</small>
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

          {latestScheduledJob ? (
            <div className="integration-note">
              <AppIcon name="check" />
              <p>
                Auto post terdaftar {registeredScheduleCount}x.
                {getScheduledJobId(latestScheduledJob)
                  ? ` Job ID: ${getScheduledJobId(latestScheduledJob)}.`
                  : ''}
                {getScheduledJobUserId(latestScheduledJob)
                  ? ` User: ${getScheduledJobUserId(latestScheduledJob)}.`
                  : ''}
                {getScheduledJobDate(latestScheduledJob)
                  ? ` Scheduled: ${getScheduledJobDate(latestScheduledJob)}.`
                  : ''}
                {getScheduledJobStatus(latestScheduledJob)
                  ? ` Status: ${getScheduledJobStatus(latestScheduledJob)}.`
                  : ''}
              </p>
            </div>
          ) : null}
        </form>

        <aside className="generate-side-column auto-post-side-column">
          <article className="panel generate-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Approved Content</p>
                <h2>Preview antrian post</h2>
              </div>
              <span className="pill subtle">approved + Threads</span>
            </div>

            <div className="integration-note">
              <AppIcon name="info" />
              <p>
                Hanya konten persona ini dengan status <strong>approved</strong> untuk platform <strong>Threads</strong> yang akan ikut batch auto post.
                {excludedOutputCount > 0 && !isLoadingOutputs
                  ? ` ${excludedOutputCount} konten persona ini tidak cocok filter dan tidak akan ikut.`
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
            ) : !form.personaConfigId.trim() ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Pilih persona dulu</strong>
                  <p>Daftar content output akan difilter setelah persona dipilih.</p>
                </div>
              </div>
            ) : approvedOutputs.length === 0 ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Belum ada approved content untuk persona ini</strong>
                  <p>Pastikan ada content output persona ini yang approved dan platform-nya Threads.</p>
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
                      {getOutputPreviewText(record).length > 120 ? '...' : ''}
                    </p>
                  </div>
                ))}
                {approvedOutputs.length > form.targetCount ? (
                  <p className="field-hint" style={{ textAlign: 'center', marginTop: '8px' }}>
                    +{approvedOutputs.length - form.targetCount} konten approved lain tidak masuk target ini.
                  </p>
                ) : null}
              </div>
            )}
          </article>
        </aside>
      </section>
    </section>
  )
}
