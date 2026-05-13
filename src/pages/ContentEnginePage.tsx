import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import {
  autoGenerateContentOutputs,
  listContentOutputs,
  type ContentOutputRecord,
} from '../services/contentOutputs'
import { listContentPillars, type ContentPillarRecord } from '../services/contentPillars'

type ContentEnginePageProps = {
  userId: string
  onOpenManualPost: () => void
}

type AutoScheduleMode = 'now' | 'later'
type ContentEngineView = 'chooser' | 'auto' | 'list'

function getRecordValue(record: ContentPillarRecord | null, keys: string[]) {
  if (!record) {
    return ''
  }

  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return ''
}

function getRecordUserId(record: ContentPillarRecord | null) {
  return getRecordValue(record, ['userId', 'user_id', 'ownerId', 'owner_id'])
}

function getPillarTitle(record: ContentPillarRecord) {
  return getRecordValue(record, ['name', 'title', 'pillarName', 'pillar_name']) || 'Untitled pillar'
}

function getPillarDescription(record: ContentPillarRecord) {
  return (
    getRecordValue(record, ['templateContent', 'template_content']) ||
    getRecordValue(record, ['keyMessage', 'key_message']) ||
    'Belum ada deskripsi ringkas untuk pillar ini.'
  )
}

function shortenText(text: string, limit = 120) {
  if (text.length <= limit) {
    return text
  }

  return `${text.slice(0, limit).trim()}...`
}

function formatDate(value: string) {
  if (!value) {
    return 'Belum tersedia'
  }

  const parsed = Date.parse(value)

  if (Number.isNaN(parsed)) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function getOutputValue(record: ContentOutputRecord | null, keys: string[]) {
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

function getOutputTitle(record: ContentOutputRecord) {
  return (
    getOutputValue(record, ['title']) ||
    getOutputValue(record, ['topic']) ||
    getOutputValue(record, ['topicId', 'topic_id']) ||
    'Untitled output'
  )
}

function getOutputPreview(record: ContentOutputRecord) {
  return (
    getOutputValue(record, ['contentOutput', 'content_output']) ||
    getOutputValue(record, ['output']) ||
    getOutputValue(record, ['result']) ||
    'Belum ada preview output.'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapWebhookResponse(response: unknown) {
  if (!isRecord(response)) {
    return {}
  }

  return isRecord(response.data) ? response.data : response
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function coerceWebhookResponse(response: unknown) {
  if (typeof response === 'string') {
    return safeParseJson(response) ?? response
  }

  return response
}

function extractTopicsFromWebhookResponse(response: unknown) {
  const root = unwrapWebhookResponse(coerceWebhookResponse(response))
  const parsedContent = isRecord(root.parsed_content) ? root.parsed_content : null
  const topicsCandidate = parsedContent?.topics ?? root.topics

  if (Array.isArray(topicsCandidate)) {
    return topicsCandidate as unknown[]
  }

  const cleanedContent = typeof root.cleaned_content === 'string' ? root.cleaned_content : ''
  const parsedCleaned = cleanedContent ? safeParseJson(cleanedContent) : null

  if (isRecord(parsedCleaned) && Array.isArray(parsedCleaned.topics)) {
    return parsedCleaned.topics as unknown[]
  }

  return []
}

export function ContentEnginePage({ userId, onOpenManualPost }: ContentEnginePageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [contentPillars, setContentPillars] = useState<ContentPillarRecord[]>([])
  const [selectedContentPillarId, setSelectedContentPillarId] = useState('')
  const [targetCount, setTargetCount] = useState(10)
  const [scheduleMode, setScheduleMode] = useState<AutoScheduleMode>('now')
  const [viewMode, setViewMode] = useState<ContentEngineView>('chooser')
  const [scheduledAt, setScheduledAt] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoadingPillars, setIsLoadingPillars] = useState(true)
  const [isLoadingOutputs, setIsLoadingOutputs] = useState(false)
  const [outputsRefreshKey, setOutputsRefreshKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responsePreview, setResponsePreview] = useState('')
  const [responseTopics, setResponseTopics] = useState<unknown[]>([])
  const [contentOutputs, setContentOutputs] = useState<ContentOutputRecord[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPillars() {
      setIsLoadingPillars(true)

      try {
        const pillars = await listContentPillars()

        if (!isMounted) {
          return
        }

        const ownedPillars = userId
          ? pillars.filter((pillar) => {
              const ownerId = getRecordUserId(pillar)
              return !ownerId || ownerId === userId
            })
          : pillars

        setContentPillars(ownedPillars)
        setSelectedContentPillarId((current) => current || ownedPillars[0]?.id || '')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setContentPillars([])
        setStatusTone('error')
        setStatusMessage(error instanceof Error ? error.message : 'Gagal memuat content pillar.')
      } finally {
        if (isMounted) {
          setIsLoadingPillars(false)
        }
      }
    }

    void loadPillars()

    return () => {
      isMounted = false
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    async function loadOutputs() {
      if (viewMode !== 'list') {
        return
      }

      setIsLoadingOutputs(true)
      setStatusMessage('')
      setStatusTone('idle')

      try {
        const outputs = await listContentOutputs(userId)

        if (!isMounted) {
          return
        }

        setContentOutputs(outputs)
        setSelectedOutputId((current) => {
          const hasCurrent = current && outputs.some((output) => output.id === current)
          return hasCurrent ? current : outputs[0]?.id || ''
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setContentOutputs([])
        setSelectedOutputId('')
        setStatusTone('error')
        setStatusMessage(error instanceof Error ? error.message : 'Gagal memuat content outputs.')
      } finally {
        if (isMounted) {
          setIsLoadingOutputs(false)
        }
      }
    }

    void loadOutputs()

    return () => {
      isMounted = false
    }
  }, [userId, viewMode, outputsRefreshKey])

  const selectedContentPillar = useMemo(
    () => contentPillars.find((pillar) => pillar.id === selectedContentPillarId) || null,
    [contentPillars, selectedContentPillarId],
  )

  const selectedContentOutput = useMemo(
    () => contentOutputs.find((output) => output.id === selectedOutputId) || null,
    [contentOutputs, selectedOutputId],
  )

  const canSubmit =
    Boolean(selectedContentPillarId) &&
    targetCount >= 1 &&
    targetCount <= 10 &&
    (scheduleMode === 'now' || Boolean(scheduledAt.trim())) &&
    !isSubmitting &&
    !isLoadingPillars

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      setStatusTone('error')
      setStatusMessage('Lengkapi pillar, target count, dan scheduled at dulu.')
      return
    }

    const scheduledAtSource =
      scheduleMode === 'now' ? new Date() : new Date(scheduledAt.trim())

    if (Number.isNaN(scheduledAtSource.getTime())) {
      setStatusTone('error')
      setStatusMessage('Scheduled time tidak valid.')
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage('Mengirim auto-generate payload...')
    setResponsePreview('')
    setResponseTopics([])

    void autoGenerateContentOutputs({
      contentPillarId: selectedContentPillarId,
      targetCount,
      scheduledAt: scheduledAtSource.toISOString(),
    })
      .then((rawData) => {
        const bodyText =
          typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2)

        setResponsePreview(bodyText || 'Response kosong dari backend.')
        setResponseTopics(extractTopicsFromWebhookResponse(rawData))
        setStatusTone('success')
        setStatusMessage('Payload auto-generate berhasil dikirim ke backend.')
        toastSuccess('Auto-generate sent', 'Payload content engine sudah dikirim.')
      })
      .catch((error) => {
        setStatusTone('error')
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengirim payload.'
        setStatusMessage(errorMessage)
        toastError('Auto-generate failed', errorMessage)
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  function handleTargetCountChange(value: string) {
    const nextValue = Number.parseInt(value, 10)

    if (Number.isNaN(nextValue)) {
      setTargetCount(1)
      return
    }

    setTargetCount(Math.min(10, Math.max(1, nextValue)))
  }

  function handleReloadOutputs() {
    setOutputsRefreshKey((current) => current + 1)
  }

  function selectContentOutput(id: string) {
    setSelectedOutputId(id)
  }

  function renderListOutputsView() {
    return (
      <section className="generate-page">
        <header className="page-header generate-hero">
          <div>
            <p className="eyebrow">Reframe Content Engine</p>
            <h1>List Outputs</h1>
            <p className="page-description">
              Lihat semua content output yang sudah digenerate untuk user aktif. Data diambil dari
              tabel output, bukan dari topic.
            </p>
          </div>
        </header>

        <div className="generate-mode-switcher">
          <span className="pill subtle">List mode</span>
          <button
            className="ghost-button generate-mode-button"
            type="button"
            onClick={() => setViewMode('chooser')}
          >
            Change flow
          </button>
          <button
            className="ghost-button generate-mode-button"
            type="button"
            onClick={handleReloadOutputs}
            disabled={isLoadingOutputs}
          >
            Refresh
          </button>
        </div>

        {statusMessage ? (
          <div
            className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}
          >
            <AppIcon name={statusTone === 'success' ? 'check' : 'info'} />
            <p>{statusMessage}</p>
          </div>
        ) : null}

        <article className="panel generate-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Content Outputs</p>
              <h2>Konten yang sudah dibuat</h2>
            </div>
            <span className="pill subtle">{contentOutputs.length} item</span>
          </div>

          {isLoadingOutputs ? (
            <div className="generate-empty-state">
              <AppIcon name="info" />
              <div>
                <strong>Memuat content outputs...</strong>
                <p>Sedang ambil daftar output yang dibuat user aktif.</p>
              </div>
            </div>
          ) : contentOutputs.length ? (
            <div className="content-output-list">
              <div className="table-wrap content-output-table-wrap">
                <table className="content-output-table">
                  <thead>
                    <tr>
                      <th>Output</th>
                      <th>Platform</th>
                      <th>Format</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentOutputs.map((record, index) => {
                      const title = getOutputTitle(record)
                      const platform = getOutputValue(record, ['platform']) || 'Unknown platform'
                      const formatOutput =
                        getOutputValue(record, ['formatOutput', 'format_output']) ||
                        'Unknown format'
                      const createdAt = formatDate(
                        getOutputValue(record, ['createdAt', 'created_at']) ||
                          getOutputValue(record, ['generatedAt', 'generated_at']) ||
                          '',
                      )
                      const isSelected = record.id === selectedOutputId

                      return (
                        <tr
                          key={record.id || `${title}-${index}`}
                          className={isSelected ? 'selected-row' : ''}
                        >
                          <td>
                            <button
                              type="button"
                              className="table-link-button"
                              onClick={() => record.id && selectContentOutput(record.id)}
                            >
                              {title}
                            </button>
                            <span className="table-subtext">
                              {shortenText(getOutputPreview(record), 96)}
                            </span>
                          </td>
                          <td>
                            <span className="chip active">{platform}</span>
                          </td>
                          <td>{formatOutput}</td>
                          <td>{createdAt}</td>
                          <td>
                            <button
                              type="button"
                              className="ghost-button table-action-button"
                              onClick={() => record.id && selectContentOutput(record.id)}
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {selectedContentOutput ? (
                <article className="content-output-detail-card">
                  <div className="content-output-card-head">
                    <div>
                      <p className="eyebrow">Selected output</p>
                      <h3>{getOutputTitle(selectedContentOutput)}</h3>
                    </div>
                    <span className="pill subtle">
                      {getOutputValue(selectedContentOutput, ['platform']) || 'Unknown platform'}
                    </span>
                  </div>

                  <div className="content-output-meta">
                    <div className="content-output-meta-item">
                      <span>Format</span>
                      <strong>
                        {getOutputValue(selectedContentOutput, ['formatOutput', 'format_output']) ||
                          'Unknown format'}
                      </strong>
                    </div>
                    <div className="content-output-meta-item">
                      <span>Created At</span>
                      <strong>
                        {formatDate(
                          getOutputValue(selectedContentOutput, ['createdAt', 'created_at']) ||
                            getOutputValue(selectedContentOutput, ['generatedAt', 'generated_at']) ||
                            '',
                        )}
                      </strong>
                    </div>
                  </div>

                  <p className="content-output-preview">{getOutputPreview(selectedContentOutput)}</p>
                </article>
              ) : null}
            </div>
          ) : (
            <div className="generate-empty-state">
              <AppIcon name="check" />
              <div>
                <strong>Belum ada output</strong>
                <p>Kalau user belum pernah generate, daftar ini masih kosong.</p>
              </div>
            </div>
          )}
        </article>
      </section>
    )
  }

  if (viewMode === 'chooser') {
    return (
      <section className="generate-page">
        <header className="page-header generate-hero">
          <div>
            <p className="eyebrow">Reframe Content Engine</p>
            <h1>Pilih dulu flow yang mau kamu edit.</h1>
            <p className="page-description">
              Kita mulai dari card supaya tampilan awal lebih tenang. Setelah dipilih, baru
              form yang sesuai muncul di bawah.
            </p>
          </div>
        </header>

        <article className="panel generate-panel generate-chooser-panel content-engine-picker">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Choose a flow</p>
              <h2>Pilih dulu yang mau kamu edit</h2>
            </div>
            <span className="pill subtle">3 option</span>
          </div>

          <p className="page-description generate-chooser-copy">
            Satu menu untuk pilih cara kerja content engine. Manual pakai topic terpilih, auto
            langsung jalan dari pillar, dan list buat lihat hasil yang sudah jadi.
          </p>

          <div className="generate-simple-chooser-grid">
            <button
              type="button"
              className="generate-simple-choice"
              onClick={onOpenManualPost}
            >
              <strong>Manual</strong>
              <p>Generate content dari topic yang dipilih.</p>
            </button>

            <button
              type="button"
              className="generate-simple-choice"
              onClick={() => setViewMode('auto')}
            >
              <strong>Auto</strong>
              <p>Generate langsung dari content pillar dengan schedule.</p>
            </button>

            <button
              type="button"
              className="generate-simple-choice"
              onClick={() => setViewMode('list')}
            >
              <strong>List Outputs</strong>
              <p>Lihat semua content output yang sudah dibuat user aktif.</p>
            </button>
          </div>
        </article>
      </section>
    )
  }

  if (viewMode === 'list') {
    return renderListOutputsView()
  }

  return (
    <section className="generate-page">
      <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Content Engine</p>
          <h1>Content Engine untuk auto-generate output.</h1>
          <p className="page-description">
            Pilih content pillar, tentukan target count, lalu kirim payload ke endpoint
            auto-generate. Generate Topic tetap ada di menu terpisah.
          </p>
        </div>

        {/* <div className="generate-hero-metrics">
          <div className="metric-card">
            <span>Backend</span>
            <strong>Connected</strong>
          </div>
          <div className="metric-card">
            <span>Target limit</span>
            <strong>Max 10</strong>
          </div>
          <div className="metric-card">
            <span>User ID</span>
            <strong>{userId || 'Not ready'}</strong>
          </div>
        </div> */}
      </header>

      <div className="generate-mode-switcher">
        <span className="pill subtle">Auto mode</span>
        <button
          className="ghost-button generate-mode-button"
          type="button"
          onClick={() => setViewMode('chooser')}
        >
          Change flow
        </button>
      </div>

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <AppIcon name={statusTone === 'success' ? 'check' : 'info'} />
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className="generate-layout">
        <div className="generate-main-column">
          <article className="panel generate-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Content Pillars</p>
                <h2>Pilih pillar milik user aktif</h2>
              </div>
              <span className="pill subtle">{contentPillars.length} pillar</span>
            </div>

            {isLoadingPillars ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Memuat content pillar...</strong>
                  <p>Sedang ambil daftar pillar yang bisa dipakai untuk auto-generate.</p>
                </div>
              </div>
            ) : contentPillars.length ? (
              <div className="generate-card-grid pillars-grid">
                {contentPillars.map((pillar) => (
                  <button
                    key={pillar.id || getPillarTitle(pillar)}
                    type="button"
                    className={`generate-card pillar-card${pillar.id === selectedContentPillarId ? ' selected' : ''}`}
                    onClick={() => pillar.id && setSelectedContentPillarId(pillar.id)}
                  >
                    <div className="generate-card-topline">
                      <span className="generate-card-chip accent">Pillar</span>
                      <span className="generate-card-id">{pillar.id || 'no-id'}</span>
                    </div>
                    <strong>{getPillarTitle(pillar)}</strong>
                    <p>{shortenText(getPillarDescription(pillar), 140)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="layers" />
                <div>
                  <strong>Belum ada pillar yang cocok</strong>
                  <p>Pastikan user ini punya content pillar yang sudah tersimpan.</p>
                </div>
              </div>
            )}
          </article>

          <article className="panel generate-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Latest Response</p>
                <h2>Hasil auto-generate</h2>
              </div>
              <span className="pill subtle">Live</span>
            </div>

            {responsePreview ? (
              <div className="generate-response-stack">
                <pre className="generate-response-preview">{responsePreview}</pre>
                {responseTopics.length ? (
                  <div className="generate-empty-state">
                    <AppIcon name="check" />
                    <div>
                      <strong>{responseTopics.length} topic parsed</strong>
                      <p>Response backend sudah berhasil dibaca.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="check" />
                <div>
                  <strong>Belum ada response</strong>
                  <p>Setelah request sukses, response auto-generate akan tampil di sini.</p>
                </div>
              </div>
            )}
          </article>
        </div>

        <aside className="generate-side-column">
          <form className="panel generate-panel generate-form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Auto Generate</p>
                <h2>Review sebelum kirim</h2>
              </div>
              <span className={`pill${canSubmit ? ' subtle' : ''}`}>
                {canSubmit ? 'Ready' : 'Needs setup'}
              </span>
            </div>

            <div className="generate-summary">
              <div className="generate-summary-item">
                <span>Content Pillar</span>
                <strong>
                  {selectedContentPillar ? getPillarTitle(selectedContentPillar) : 'Belum dipilih'}
                </strong>
              </div>
              <div className="generate-summary-item">
                <span>Target Count</span>
                <strong>{targetCount}</strong>
              </div>
              <div className="generate-summary-item">
                <span>Schedule</span>
                <strong>{scheduleMode === 'now' ? 'Now' : 'Scheduled later'}</strong>
              </div>
            </div>

            <div className="generate-mode-chooser content-engine-mode-chooser">
              <button
                type="button"
                className={`panel generate-entry-card${scheduleMode === 'now' ? ' selected' : ''}`}
                onClick={() => setScheduleMode('now')}
              >
                <span className="generate-entry-pill">Now</span>
                <strong>Produce manual sekarang</strong>
                <p>Payload langsung dikirim dengan scheduledAt waktu sekarang.</p>
              </button>

              <button
                type="button"
                className={`panel generate-entry-card${scheduleMode === 'later' ? ' selected' : ''}`}
                onClick={() => setScheduleMode('later')}
              >
                <span className="generate-entry-pill accent">Schedule</span>
                <strong>Schedule untuk nanti</strong>
                <p>Isi waktu kirim lalu backend akan proses sesuai jadwal yang dipilih.</p>
              </button>
            </div>

            <label className="persona-field full-width">
              <span>Target Count</span>
              <div className="topic-stepper">
                <button
                  className="stepper-button"
                  type="button"
                  onClick={() => handleTargetCountChange(String(targetCount - 1))}
                  disabled={targetCount <= 1}
                >
                  <AppIcon name="minus" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={targetCount}
                  onChange={(event) => handleTargetCountChange(event.target.value)}
                />
                <button
                  className="stepper-button"
                  type="button"
                  onClick={() => handleTargetCountChange(String(targetCount + 1))}
                  disabled={targetCount >= 10}
                >
                  <AppIcon name="plus" />
                </button>
              </div>
              <small className="field-hint">Masukkan angka 1 sampai 10.</small>
            </label>

            {scheduleMode === 'later' ? (
              <label className="persona-field full-width">
                <span>Scheduled At</span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
                <small className="field-hint">Pilih waktu kirim untuk payload auto-generate.</small>
              </label>
            ) : (
              <div className="generate-empty-state generate-now-state">
                <AppIcon name="clock" />
                <div>
                  <strong>Run now</strong>
                  <p>Payload akan dikirim dengan scheduledAt waktu sekarang.</p>
                </div>
              </div>
            )}

            <div className="persona-actions persona-actions-preview generate-actions">
              <button className="primary-button" type="submit" disabled={!canSubmit}>
                {isSubmitting ? 'Mengirim...' : 'Auto Generate'}
              </button>
            </div>

            <div className="generate-note">
              <AppIcon name="info" />
              <p>Payload yang dikirim: `contentPillarId`, `targetCount`, dan `scheduledAt`.</p>
            </div>
          </form>
        </aside>
      </section>
    </section>
  )
}
