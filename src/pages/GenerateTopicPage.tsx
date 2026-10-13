import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { ContentGenerationProgress } from '../components/ContentGenerationProgress'
import { useToast } from '../components/useToast'
import { getUserFacingError } from '../utils/apiError'
import { dismissModal } from '../utils/modalAnimation'
import { createContentTopic, generateContentTopics } from '../services/contentTopics'
import { listContentPillars, type ContentPillarRecord } from '../services/contentPillars'
import { listPersonaConfigs, type PersonaConfigRecord } from '../services/personaConfigs'
import { getCurrentSubscription } from '../services/subscriptionPlans'

type GenerateTopicPageProps = {
  userId: string
  onContinueToContent?: () => void
  tourStep?: number | null
  onTopicsGenerated?: () => void
  onTopicSaved?: () => void
  onUpgrade?: () => void
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

function getPillarPersonaId(record: ContentPillarRecord | null) {
  return getRecordValue(record, ['personaConfigId', 'persona_config_id'])
}

function getPersonaValue(record: PersonaConfigRecord | null, keys: string[]) {
  if (!record) return ''
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function getPersonaTitle(record: PersonaConfigRecord) {
  return getPersonaValue(record, ['persona', 'personaName', 'persona_name']) || 'Persona utama'
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
  locked,
  onClick,
}: {
  pillar: ContentPillarRecord
  selected: boolean
  locked: boolean
  onClick: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={`idea-persona-option idea-pillar-option${selected ? ' selected' : ''}`}
      onClick={() => pillar.id && onClick(pillar.id)}
      disabled={!pillar.id}
    >
      <span className="idea-persona-avatar"><AppIcon name="layers" /></span>
      <span>
        <strong>{getPillarTitle(pillar)}</strong>
        <small>{shortenText(getPillarDescription(pillar), 100)}</small>
      </span>
      {selected ? <span className="pill subtle">Aktif</span> : <AppIcon name={locked ? 'lock' : 'chevron-right'} />}
    </button>
  )
}

export function GenerateTopicPage({ userId, onContinueToContent, onUpgrade }: GenerateTopicPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [contentPillars, setContentPillars] = useState<ContentPillarRecord[]>([])
  const [personas, setPersonas] = useState<PersonaConfigRecord[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState('')
  const [isFreePlan, setIsFreePlan] = useState(true)
  const [upgradePrompt, setUpgradePrompt] = useState<'persona' | 'pillar' | null>(null)
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
        const [pillars, personaRecords, subscription] = await Promise.all([
          listContentPillars(),
          listPersonaConfigs().catch(() => []),
          getCurrentSubscription().catch(() => null),
        ])

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
        setPersonas(personaRecords)
        setIsFreePlan(!subscription || `${subscription.planKey} ${subscription.planName}`.toLowerCase().includes('free'))
        const initialPillar = ownedPillars[0] || null
        const initialPersonaId = getPillarPersonaId(initialPillar) || personaRecords[0]?.id || ''
        setSelectedPersonaId((current) => current || initialPersonaId)
        setSelectedContentPillarId((current) => current || initialPillar?.id || '')
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
  const selectedPersona = useMemo(
    () => personas.find((persona) => persona.id === selectedPersonaId) || personas[0] || null,
    [personas, selectedPersonaId],
  )
  const filteredPillars = useMemo(() => {
    if (!selectedPersonaId) return contentPillars
    const matching = contentPillars.filter((pillar) => getPillarPersonaId(pillar) === selectedPersonaId)
    return matching.length ? matching : contentPillars
  }, [contentPillars, selectedPersonaId])

  function handlePersonaSelection(id: string) {
    if (!id || id === selectedPersonaId) return
    if (isFreePlan) {
      setUpgradePrompt('persona')
      return
    }
    setSelectedPersonaId(id)
    const firstMatchingPillar = contentPillars.find((pillar) => getPillarPersonaId(pillar) === id)
    setSelectedContentPillarId(firstMatchingPillar?.id || '')
    resetResponseState()
  }

  function handlePillarSelection(id: string) {
    if (!id || id === selectedContentPillarId) return
    if (isFreePlan) {
      setUpgradePrompt('pillar')
      return
    }
    setSelectedContentPillarId(id)
    resetResponseState()
  }

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
          <p className="page-description">Pilih persona dan pillar, lalu tentukan berapa ide yang ingin kamu dapatkan.</p>
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
          <article className="panel generate-panel idea-persona-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Persona</p>
                <h2>Pilih Persona</h2>
                <p className="page-description">Persona menentukan sudut pandang, audiens, dan gaya ide yang dibuat.</p>
              </div>
              {isFreePlan ? <span className="pill subtle">Free · terkunci</span> : null}
            </div>
            <div className="idea-persona-list">
              {personas.length ? personas.map((persona) => (
                <button
                  key={persona.id || getPersonaTitle(persona)}
                  type="button"
                  className={`idea-persona-option${persona.id === selectedPersonaId ? ' selected' : ''}`}
                  onClick={() => persona.id && handlePersonaSelection(persona.id)}
                >
                  <span className="idea-persona-avatar"><AppIcon name="user" /></span>
                  <span>
                    <strong>{getPersonaTitle(persona)}</strong>
                    <small>{getPersonaValue(persona, ['targetAudience', 'target_audience']) || 'Audiens belum diatur'}</small>
                  </span>
                  {persona.id === selectedPersonaId ? <span className="pill subtle">Aktif</span> : <AppIcon name={isFreePlan ? 'lock' : 'chevron-right'} />}
                </button>
              )) : (
                <div className="generate-empty-state"><AppIcon name="user" /><div><strong>Persona belum tersedia</strong></div></div>
              )}
            </div>
            {selectedPersona ? <p className="idea-selection-context">Tone: <strong>{getPersonaValue(selectedPersona, ['tone']) || 'Belum diatur'}</strong> · Fokus: <strong>{getPersonaValue(selectedPersona, ['nicheTopicFocus', 'niche_topic_focus']) || 'Belum diatur'}</strong></p> : null}
          </article>

          <article className="panel generate-panel idea-pillar-panel">
            <div className="panel-heading">
              <div>
                <h2>Pilih Pillar</h2>
                <p className="page-description">Pillar adalah tema utama yang menjadi arah ide kontenmu.</p>
              </div>
              <div className="pillars-panel-meta">
                {isFreePlan ? <span className="pill subtle">Free · terkunci</span> : null}
                <span className="pill subtle">{filteredPillars.length} pillar</span>
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
                  <strong>Memuat pillar...</strong>
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
                        locked={isFreePlan}
                        onClick={handlePillarSelection}
                      />
                    ))}
                  </div>
                </div>
	            ) : (
              <div className="generate-empty-state">
                <AppIcon name="layers" />
                <div>
                  <strong>Belum ada pillar</strong>
                  <p>Lengkapi Content Brain untuk mulai mencari ide.</p>
                </div>
              </div>
            )}
          </article>

          {responseTopics.length ? <article className="panel generate-panel generate-results-modal" role="dialog" aria-modal="true" aria-label="Hasil ide">
            <div className="panel-heading compact">
              <div>
                <h2>{responseTopics.length ? 'Ide untuk kamu' : 'Hasil ide'}</h2>
                {responseTopics.length ? (
                  <p className="page-description generate-results-description">
                    Pilih ide yang ingin kamu jadikan konten.
                  </p>
                ) : null}
              </div>
              <div className="generate-response-meta">
                {responseTopics.length ? <span className="pill subtle">{responseTopics.length} ide</span> : null}
                <button className="generate-results-close" type="button" onClick={(event) => dismissModal(resetResponseState, event.currentTarget)} aria-label="Tutup hasil ide"><AppIcon name="close" /></button>
              </div>
            </div>

            {responseTopics.length ? (
              <div className="generate-response-stack">
                <div className="generate-topics-preview">
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
                            <div className="generate-topic-fields">
                              <label className="generate-topic-field generate-topic-title-field">
                                <span>Judul ide</span>
                                <input
                                  type="text"
                                  value={draft.title}
                                  onChange={(event) =>
                                    handleDraftChange(index, 'title', event.target.value)
                                  }
                                  placeholder="Edit judul ide"
                                />
                              </label>
                              <label className="generate-topic-field generate-topic-category-field">
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
                            </div>
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

                    <div
                      className="idea-selection-actions"
                      role="toolbar"
                      aria-label="Aksi ide terpilih"
                    >
                      <strong className="idea-selection-summary">
                        {selectedTopicIndices.length} dari {responseTopics.length} dipilih
                      </strong>
                      <button
                        className="primary-button idea-selection-primary"
                        type="button"
                        disabled={!selectedTopicIndices.length || savingTopicIndices.length > 0}
                        onClick={() => void saveSelectedTopics(true)}
                      >
                        Buat Konten dari {selectedTopicIndices.length} Ide
                      </button>
                      <div className="idea-selection-secondary-actions">
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!selectedTopicIndices.length || savingTopicIndices.length > 0}
                          onClick={() => void saveSelectedTopics(false)}
                        >
                          Simpan untuk nanti
                        </button>
                        <button className="text-button" type="button" onClick={(event) => dismissModal(resetResponseState, event.currentTarget)}>
                          Cari ide lainnya
                        </button>
                      </div>
                    </div>

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
          </article> : null}
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
                <span>Pillar</span>
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

      {upgradePrompt ? (
        <div className="content-bank-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) dismissModal(() => setUpgradePrompt(null), event.currentTarget)
        }}>
          <section className="content-bank-dialog idea-upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="idea-upgrade-title">
            <header>
              <div>
                <p className="eyebrow">Fitur premium</p>
                <h2 id="idea-upgrade-title">Upgrade untuk mengganti {upgradePrompt === 'persona' ? 'persona' : 'pillar'}</h2>
              </div>
              <button type="button" onClick={(event) => dismissModal(() => setUpgradePrompt(null), event.currentTarget)} aria-label="Tutup">×</button>
            </header>
            <div className="idea-upgrade-body">
              <span className="idea-upgrade-icon"><AppIcon name="lock" /></span>
              <p>Akun Free menggunakan persona dan pillar utama. Upgrade paket untuk memilih konfigurasi lain saat mencari ide.</p>
              <div className="idea-upgrade-actions">
                <button className="ghost-button" type="button" onClick={(event) => dismissModal(() => setUpgradePrompt(null), event.currentTarget)}>Nanti</button>
                <button className="primary-button" type="button" onClick={() => { setUpgradePrompt(null); onUpgrade?.() }}>Lihat Paket</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
