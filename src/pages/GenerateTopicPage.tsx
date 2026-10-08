import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { ContentGenerationProgress } from '../components/ContentGenerationProgress'
import { useToast } from '../components/useToast'
import { getUserFacingError } from '../utils/apiError'
import { createContentTopic, generateContentTopics } from '../services/contentTopics'
import { listContentPillars, type ContentPillarRecord } from '../services/contentPillars'

type GenerateTopicPageProps = {
  userId: string
  onContinueToContent?: () => void
  tourStep?: number | null
  onTopicsGenerated?: () => void
  onTopicSaved?: () => void
}

type GeneratedTopic = string | Record<string, unknown>

type NormalizedGeneratedTopic = {
  title: string
  categoryType: string
  angle: string
  audiencePain: string
  whyItWorks: string
  raw: GeneratedTopic
}

type TopicDraft = {
  title: string
  categoryType: string
  angle: string
  audiencePain: string
  whyItWorks: string
}

type TokenUsageSummary = {
  totalTokens: number
  promptTokens: number
  completionTokens: number
}

const maxTopics = 10

const topicCategoryOptions = [
  'educational',
  'storytelling',
  'opinion',
  'soft_selling',
  'checklist',
  'myth_busting',
  'tutorial'
]

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
  return (
    getRecordValue(record, ['name', 'title', 'pillarName', 'pillar_name']) ||
    'Untitled pillar'
  )
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

function extractTopicsFromWebhookResponse(response: unknown): GeneratedTopic[] {
  const root = unwrapWebhookResponse(coerceWebhookResponse(response))
  const parsedContent = isRecord(root.parsed_content) ? root.parsed_content : null
  const topicsCandidate = parsedContent?.topics ?? root.topics

  if (Array.isArray(topicsCandidate)) {
    return topicsCandidate as GeneratedTopic[]
  }

  const cleanedContent = typeof root.cleaned_content === 'string' ? root.cleaned_content : ''
  const parsedCleaned = cleanedContent ? safeParseJson(cleanedContent) : null

  if (isRecord(parsedCleaned) && Array.isArray(parsedCleaned.topics)) {
    return parsedCleaned.topics as GeneratedTopic[]
  }

  return []
}

function extractTokenUsageFromWebhookResponse(response: unknown): TokenUsageSummary | null {
  const root = unwrapWebhookResponse(coerceWebhookResponse(response))
  const usage = isRecord(root.usage) ? root.usage : null

  if (!usage) {
    return null
  }

  const totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? 0)
  const promptTokens = Number(usage.prompt_tokens ?? usage.promptTokens ?? 0)
  const completionTokens = Number(usage.completion_tokens ?? usage.completionTokens ?? 0)

  if (!totalTokens && !promptTokens && !completionTokens) {
    return null
  }

  return {
    totalTokens,
    promptTokens,
    completionTokens,
  }
}

function topicLabel(topic: GeneratedTopic, index: number) {
  if (typeof topic === 'string') {
    return topic.trim() || `Topic ${index + 1}`
  }

  const candidate =
    (typeof topic.title === 'string' && topic.title.trim()) ||
    (typeof topic.topic === 'string' && topic.topic.trim()) ||
    (typeof topic.name === 'string' && topic.name.trim()) ||
    (typeof topic.content === 'string' && topic.content.trim()) ||
    JSON.stringify(topic)

  return candidate || `Topic ${index + 1}`
}

function readTopicValue(topic: GeneratedTopic, keys: string[]) {
  if (!isRecord(topic)) {
    return ''
  }

  for (const key of keys) {
    const value = topic[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function normalizeGeneratedTopic(topic: GeneratedTopic, index = 0): NormalizedGeneratedTopic {
  const title = topicLabel(topic, index)

  return {
    title,
    categoryType: readTopicValue(topic, ['category_type', 'categoryType', 'category']) || '',
    angle: readTopicValue(topic, ['angle']),
    audiencePain: readTopicValue(topic, ['audience_pain', 'audiencePain']),
    whyItWorks: readTopicValue(topic, ['why_it_works', 'whyItWorks']),
    raw: topic,
  }
}

function PillarCard({
  pillar,
  selected,
  onClick,
}: {
  pillar: ContentPillarRecord
  selected: boolean
  onClick: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={`generate-card pillar-card${selected ? ' selected' : ''}`}
      onClick={() => pillar.id && onClick(pillar.id)}
      disabled={!pillar.id}
    >
      <div className="generate-card-topline">
        <span className="generate-card-chip accent">Topik utama</span>
      </div>
      <strong>{getPillarTitle(pillar)}</strong>
      <p>{shortenText(getPillarDescription(pillar), 140)}</p>
    </button>
  )
}

export function GenerateTopicPage({ userId, onContinueToContent }: GenerateTopicPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [contentPillars, setContentPillars] = useState<ContentPillarRecord[]>([])
  const [selectedContentPillarId, setSelectedContentPillarId] = useState('')
  const [jumlahTopics, setJumlahTopics] = useState(5)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoadingPillars, setIsLoadingPillars] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responseTopics, setResponseTopics] = useState<GeneratedTopic[]>([])
  const [topicDrafts, setTopicDrafts] = useState<TopicDraft[]>([])
  const [savedTopicIndices, setSavedTopicIndices] = useState<number[]>([])
  const [savingTopicIndices, setSavingTopicIndices] = useState<number[]>([])
  const [selectedTopicIndices, setSelectedTopicIndices] = useState<number[]>([])
  const [, setTokenUsage] = useState<TokenUsageSummary | null>(null)
  const pillarsRailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadWorkspaceData() {
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
        setStatusMessage(error instanceof Error ? error.message : 'Gagal memuat workspace data.')
      } finally {
        if (isMounted) {
          setIsLoadingPillars(false)
        }
      }
    }

    void loadWorkspaceData()

    return () => {
      isMounted = false
    }
  }, [userId])

  const selectedContentPillar = useMemo(
    () => contentPillars.find((pillar) => pillar.id === selectedContentPillarId) || null,
    [contentPillars, selectedContentPillarId],
  )
  const normalizedResponseTopics = useMemo(
    () => responseTopics.map((topic, index) => normalizeGeneratedTopic(topic, index)),
    [responseTopics],
  )
  const filteredPillars = contentPillars

  useEffect(() => {
    setTopicDrafts(normalizedResponseTopics)
    setSavedTopicIndices([])
    setSavingTopicIndices([])
    setSelectedTopicIndices(normalizedResponseTopics.map((_, index) => index))
  }, [normalizedResponseTopics])

  const canSubmitManual =
    Boolean(selectedContentPillarId) &&
    contentPillars.length > 0 &&
    jumlahTopics >= 1 &&
    jumlahTopics <= maxTopics &&
    !isSubmitting &&
    !isLoadingPillars

  function resetResponseState() {
    setStatusTone('idle')
    setStatusMessage('')
    setResponseTopics([])
    setTopicDrafts([])
    setSavedTopicIndices([])
    setSavingTopicIndices([])
    setTokenUsage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmitManual) {
      setStatusTone('error')
      setStatusMessage(
        !contentPillars.length
        ? 'Topik utama belum tersedia. Lengkapi Content Brain terlebih dahulu.'
          : 'Pilih topik utama dan jumlah ide terlebih dahulu.',
      )
      return
    }

    if (jumlahTopics > maxTopics) {
      setStatusTone('error')
      setStatusMessage(`Jumlah topic maksimal ${maxTopics}.`)
      setJumlahTopics(maxTopics)
      return
    }

    setIsSubmitting(true)
    resetResponseState()

    void generateContentTopics({
      contentPillarId: selectedContentPillarId,
      templateText: '',
      jumlahTopics,
    })
      .then((rawData) => {
        const topics = extractTopicsFromWebhookResponse(rawData)
        const usage = extractTokenUsageFromWebhookResponse(rawData)

        setResponseTopics(topics)
        setTokenUsage(usage)
      })
      .catch((error) => {
        setStatusTone('error')
        const detail = getUserFacingError(error, 'Coba generate lagi dalam beberapa saat.')
        const errorMessage = `Ide belum berhasil dibuat. ${detail}`
        setStatusMessage(errorMessage)
        toastError('Ide belum berhasil dibuat', errorMessage)
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  async function handleSaveTopic(topic: GeneratedTopic, index: number) {
    const normalizedTopic = normalizeGeneratedTopic(topic, index)
    const draft = topicDrafts[index] || normalizedTopic
    const contentPillarId = selectedContentPillar?.id || ''
    const personaConfigId =
      getRecordValue(selectedContentPillar, ['personaConfigId', 'persona_config_id']) || ''

    if (!userId || !contentPillarId || !personaConfigId || !draft.title.trim()) {
      setStatusTone('error')
      setStatusMessage('Pilih topik utama yang valid sebelum menyimpan ide.')
      return false
    }

    if (!draft.categoryType.trim()) {
      setStatusTone('error')
      setStatusMessage(`Ide "${draft.title}" belum memiliki kategori.`)
      return false
    }

    setSavingTopicIndices((current) => (current.includes(index) ? current : [...current, index]))
    setStatusTone('idle')
    setStatusMessage(`Menyimpan ide "${draft.title}"...`)

    try {
      await createContentTopic({
        userId,
        personaConfigId,
        contentPillarId,
        category: draft.categoryType,
        subcategory: '',
        topic: draft.title,
      })

      setSavedTopicIndices((current) => (current.includes(index) ? current : [...current, index]))
      setStatusTone('success')
      setStatusMessage(`Ide "${draft.title}" berhasil disimpan.`)
      toastSuccess('Ide tersimpan', `"${draft.title}" sudah masuk ke ide tersimpan.`)
      return true
    } catch (error) {
      setStatusTone('error')
      const detail = getUserFacingError(error, 'Coba lagi sebelum membuat konten.')
      const errorMessage = `Ide belum berhasil disimpan. ${detail}`
      setStatusMessage(errorMessage)
      toastError('Ide belum berhasil disimpan', errorMessage)
      return false
    } finally {
      setSavingTopicIndices((current) => current.filter((savedIndex) => savedIndex !== index))
    }
  }

  async function saveSelectedTopics(continueToContent: boolean) {
    const pending = selectedTopicIndices.filter((index) => !savedTopicIndices.includes(index))
    for (const index of pending) {
      const saved = await handleSaveTopic(responseTopics[index], index)
      if (!saved) return
    }
    if (continueToContent) onContinueToContent?.()
  }

  function handleDraftChange(index: number, key: keyof TopicDraft, value: string) {
    setTopicDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, [key]: value } : draft)),
    )
    setSavedTopicIndices((current) => current.filter((savedIndex) => savedIndex !== index))
  }

  function handleTopicsChange(value: string) {
    const nextValue = Number.parseInt(value, 10)

    if (Number.isNaN(nextValue)) {
      setJumlahTopics(1)
      return
    }

    setJumlahTopics(Math.min(maxTopics, Math.max(1, nextValue)))
  }

  function scrollPillars(direction: 'left' | 'right') {
    const rail = pillarsRailRef.current

    if (!rail) {
      return
    }

    const amount = Math.max(rail.clientWidth * 0.82, 280)

    rail.scrollBy({
      left: direction === 'right' ? amount : -amount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="generate-page">
      <header className="page-header generate-hero">
        <div>
          <h1>Cari ide konten</h1>
          <p className="page-description">Pilih topik utama dan tentukan berapa ide yang ingin kamu dapatkan.</p>
        </div>

        {/* <div className="generate-hero-metrics" style={{paddingTop:"15px"}}>
          <div className="metric-card">
            <span>Backend</span>
            <strong>Connected</strong>
          </div>
          <div className="metric-card">
            <span>Topic limit</span>
              <strong>Max {maxTopics}</strong>
          </div>
          <div className="metric-card">
            <span>User ID</span>
            <strong>{userId || 'Not ready'}</strong>
          </div>
        </div> */}
      </header>
      <div className="create-flow-progress" aria-label="Alur pembuatan konten"><strong>Ide</strong><span>→</span><span>Buat</span><span>→</span><span>Review</span></div>

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <AppIcon name={statusTone === 'success' ? 'check' : 'info'} />
          <p>{statusMessage}</p>
        </div>
      ) : null}

      {isSubmitting ? <ContentGenerationProgress label="Generating topics..." /> : null}

      <section className="generate-layout">
        <div className="generate-main-column">
          <article className="panel generate-panel">
            <div className="panel-heading">
              <div>
                <h2>Pilih topik utama</h2>
              </div>
              <div className="pillars-panel-meta">
                <span className="pill subtle">{filteredPillars.length} topik</span>
                {filteredPillars.length > 2 ? (
                  <div className="pillars-carousel-actions">
                    <button
                      className="ghost-button pillars-carousel-button"
                      type="button"
                      onClick={() => scrollPillars('left')}
                      aria-label="Pillar sebelumnya"
                    >
                      <AppIcon name="chevron-left" />
                    </button>
                    <button
                      className="ghost-button pillars-carousel-button"
                      type="button"
                      onClick={() => scrollPillars('right')}
                      aria-label="Pillar berikutnya"
                    >
                      <AppIcon name="chevron-right" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {isLoadingPillars ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Memuat topik utama...</strong>
                </div>
              </div>
	            ) : filteredPillars.length ? (
                <div className="pillars-carousel">
                  <div className="pillars-rail" ref={pillarsRailRef}>
                    {filteredPillars.map((pillar) => (
                      <PillarCard
                        key={pillar.id || getPillarTitle(pillar)}
                        pillar={pillar}
                        selected={pillar.id === selectedContentPillarId}
                        onClick={(id) => setSelectedContentPillarId(id)}
                      />
                    ))}
                  </div>
                </div>
	            ) : (
              <div className="generate-empty-state">
                <AppIcon name="layers" />
                <div>
                  <strong>Belum ada topik utama</strong>
                  <p>Lengkapi Content Brain untuk mulai mencari ide.</p>
                </div>
              </div>
            )}
          </article>

          <article className="panel generate-panel">
            <div className="panel-heading compact">
              <div>
                    <h2>{responseTopics.length ? 'Ide untuk kamu' : 'Hasil ide'}</h2>
              </div>
              <div className="generate-response-meta">
                {responseTopics.length ? <span className="pill subtle">{responseTopics.length} ide</span> : null}
              </div>
            </div>

            {responseTopics.length ? (
              <div className="generate-response-stack">
                <div className="generate-topics-preview">
                  <div className="panel-heading compact">
                    <div>
                      <h2>Ide untuk kamu</h2>
                      <p className="page-description">Pilih ide yang ingin kamu jadikan konten.</p>
                    </div>
                    <span className="pill subtle">{responseTopics.length} items</span>
                  </div>

                    <div className="generate-topic-grid">
                      {normalizedResponseTopics.map((normalizedTopic, index) => {
                        const isSaved = savedTopicIndices.includes(index)
                        const isSaving = savingTopicIndices.includes(index)
                        const sourceTopic = responseTopics[index]
                        const draft = topicDrafts[index] || normalizedTopic

                        return (
                          <article
                            className={`generate-topic-card selectable${selectedTopicIndices.includes(index) ? ' selected' : ''}`}
                            key={`${normalizedTopic.title || topicLabel(sourceTopic, index)}-${index}`}
                          >
                            <button className="idea-select-toggle" type="button" onClick={() => setSelectedTopicIndices((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current,index])} aria-label={`Pilih ide ${index + 1}`}>{selectedTopicIndices.includes(index) ? '✓' : ''}</button>
                            <span className="generate-topic-index">Ide {index + 1}</span>
                            <label className="generate-topic-field">
                              <span>Judul ide</span>
                              <input
                                type="text"
                                value={draft.title}
                                onChange={(event) =>
                                  handleDraftChange(index, 'title', event.target.value)
                                }
                                placeholder="Edit judul topic"
                              />
                            </label>
                            <label className="generate-topic-field">
                              <span>Kategori</span>
                              <select
                                value={draft.categoryType}
                                onChange={(event) =>
                                  handleDraftChange(index, 'categoryType', event.target.value)
                                }
                              >
                                <option value="">Pilih kategori</option>
                                {topicCategoryOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="generate-topic-metadata">
                              <span className="pill subtle">
                                {draft.categoryType || 'No category_type'}
                              </span>
                              {draft.angle ? (
                                <span className="generate-topic-meta-text">
                                  Angle: {draft.angle}
                                </span>
                              ) : null}
                            </div>
                            {draft.audiencePain ? (
                              <p className="generate-topic-detail">
                                Pain: {draft.audiencePain}
                              </p>
                            ) : null}
                            {draft.whyItWorks ? (
                              <p className="generate-topic-detail">
                                Why it works: {draft.whyItWorks}
                              </p>
                            ) : null}
                            {isSaved ? <span className="idea-saved-label">Tersimpan ✓</span> : isSaving ? <span className="idea-saved-label">Menyimpan...</span> : null}
                          </article>
                        )
                      })}
                    </div>

                    <div className="idea-selection-actions"><strong>{selectedTopicIndices.length} dari {responseTopics.length} dipilih</strong><button className="primary-button" type="button" disabled={!selectedTopicIndices.length || savingTopicIndices.length > 0} onClick={() => void saveSelectedTopics(true)}>Buat Konten dari {selectedTopicIndices.length} Ide</button><button className="ghost-button" type="button" disabled={!selectedTopicIndices.length || savingTopicIndices.length > 0} onClick={() => void saveSelectedTopics(false)}>Simpan untuk nanti</button><button className="text-button" type="button" onClick={resetResponseState}>Cari ide lainnya</button></div>

                  </div>
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="check" />
                <div>
                  <strong>Ide yang kamu cari akan muncul di sini</strong>
                  {/* <p>Setelah request sukses, response dari N8N akan tampil di sini.</p> */}
                </div>
              </div>
            )}
          </article>
        </div>

        {!responseTopics.length ? <aside className="generate-side-column">
          <form className="panel generate-panel generate-form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <h2>Jumlah ide</h2>
              </div>
              <span className={`pill${canSubmitManual ? ' subtle' : ''}`}>
                {canSubmitManual ? 'Siap' : 'Lengkapi data'}
              </span>
            </div>

            <div className="generate-summary">
              <div className="generate-summary-item">
                <span>Topik utama</span>
                <strong>
                  {selectedContentPillar ? getPillarTitle(selectedContentPillar) : 'Belum dipilih'}
                </strong>
              </div>
            </div>

            <label className="persona-field full-width">
              <span>Berapa ide yang kamu inginkan?</span>
              <div className="topic-stepper">
                <button
                  className="stepper-button"
                  type="button"
                  onClick={() => handleTopicsChange(String(jumlahTopics - 1))}
                  disabled={jumlahTopics <= 1}
                >
                  <AppIcon name="minus" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxTopics}
                  value={jumlahTopics}
                  onChange={(event) => handleTopicsChange(event.target.value)}
                />
                <button
                  className="stepper-button"
                  type="button"
                  onClick={() => handleTopicsChange(String(jumlahTopics + 1))}
                  disabled={jumlahTopics >= maxTopics}
                >
                  <AppIcon name="plus" />
                </button>
              </div>
              <small className="field-hint">Masukkan angka 1 sampai {maxTopics}.</small>
            </label>

            <div className="persona-actions persona-actions-preview generate-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!canSubmitManual}
              >
                {isSubmitting ? 'Mencari ide...' : `Cari ${jumlahTopics} Ide`}
              </button>
            </div>

            {/* <div className="generate-note">
              <AppIcon name="info" />
              <p>
                Generate topic sementara hanya memakai content pillar dari user aktif.
              </p>
            </div> */}
          </form>
        </aside> : null}
      </section>
    </section>
  )
}
