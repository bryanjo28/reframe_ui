import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { createContentTopic, generateContentTopics } from '../services/contentTopics'
import { listContentPillars, type ContentPillarRecord } from '../services/contentPillars'
import { listPromptTemplates, type PromptTemplateRecord } from '../services/promptTemplates'

type GenerateTopicPageProps = {
  userId: string
}

type SelectedTemplate = PromptTemplateRecord & {
  normalizedName: string
  normalizedDescription: string
  normalizedPrompt: string
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

function getRecordValue(record: ContentPillarRecord | PromptTemplateRecord | null, keys: string[]) {
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

function getRecordUserId(record: ContentPillarRecord | PromptTemplateRecord | null) {
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

function getTemplateTitle(record: PromptTemplateRecord) {
  return getRecordValue(record, ['name', 'title', 'promptName', 'prompt_name']) || 'Prompt Template'
}

function getTemplateDescription(record: PromptTemplateRecord) {
  return (
    getRecordValue(record, ['description', 'summary', 'excerpt']) ||
    'Pilih card template ini untuk dipakai ke payload generate.'
  )
}

function getTemplatePrompt(record: PromptTemplateRecord) {
  return (
    getRecordValue(record, ['prompt', 'template', 'content', 'body']) ||
    getRecordValue(record, ['systemPrompt', 'system_prompt']) ||
    'Tidak ada isi template yang bisa ditampilkan.'
  )
}

function shortenText(text: string, limit = 120) {
  if (text.length <= limit) {
    return text
  }

  return `${text.slice(0, limit).trim()}...`
}

function excerptWords(text: string, wordLimit = 120) {
  const words = text.trim().split(/\s+/).filter(Boolean)

  if (!words.length) {
    return ''
  }

  if (words.length <= wordLimit) {
    return text.trim()
  }

  return `${words.slice(0, wordLimit).join(' ')}...`
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

function TemplateCard({
  template,
  selected,
  onClick,
}: {
  template: SelectedTemplate
  selected: boolean
  onClick: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={`generate-card template-card${selected ? ' selected' : ''}`}
      onClick={() => template.id && onClick(template.id)}
      disabled={!template.id}
    >
      <div className="generate-card-topline">
        <span className="generate-card-chip">Template</span>
      </div>
      <strong>{template.normalizedName}</strong>
      <p className="generate-card-summary">
        {shortenText(template.normalizedDescription, 120)}
      </p>
      <p className="generate-card-excerpt">
        {excerptWords(template.normalizedPrompt || template.normalizedDescription, 50)}
      </p>
    </button>
  )
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
        <span className="generate-card-chip accent">Pillar</span>
      </div>
      <strong>{getPillarTitle(pillar)}</strong>
      <p>{shortenText(getPillarDescription(pillar), 140)}</p>
    </button>
  )
}

export function GenerateTopicPage({ userId }: GenerateTopicPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [contentPillars, setContentPillars] = useState<ContentPillarRecord[]>([])
  const [selectedContentPillarId, setSelectedContentPillarId] = useState('')
  const [promptTemplates, setPromptTemplates] = useState<SelectedTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [jumlahTopics, setJumlahTopics] = useState(5)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoadingPillars, setIsLoadingPillars] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responseTopics, setResponseTopics] = useState<GeneratedTopic[]>([])
  const [topicDrafts, setTopicDrafts] = useState<TopicDraft[]>([])
  const [savedTopicIndices, setSavedTopicIndices] = useState<number[]>([])
  const [savingTopicIndices, setSavingTopicIndices] = useState<number[]>([])
  const [tokenUsage, setTokenUsage] = useState<TokenUsageSummary | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadWorkspaceData() {
      setIsLoadingPillars(true)
      setIsLoadingTemplates(true)

      try {
        const [pillars, templates] = await Promise.all([
          listContentPillars(),
          listPromptTemplates(),
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
        setSelectedContentPillarId((current) => current || ownedPillars[0]?.id || '')

        const normalizedTemplates = templates.map((template) => ({
          ...template,
          normalizedName: getTemplateTitle(template),
          normalizedDescription: getTemplateDescription(template),
          normalizedPrompt: getTemplatePrompt(template),
        }))

        setPromptTemplates(normalizedTemplates)
        setSelectedTemplateId((current) => current || normalizedTemplates[0]?.id || '')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setContentPillars([])
        setPromptTemplates([])
        setStatusTone('error')
        setStatusMessage(error instanceof Error ? error.message : 'Gagal memuat workspace data.')
      } finally {
        if (isMounted) {
          setIsLoadingPillars(false)
          setIsLoadingTemplates(false)
        }
      }
    }

    void loadWorkspaceData()

    return () => {
      isMounted = false
    }
  }, [userId])

  const selectedTemplate = useMemo(
    () => promptTemplates.find((template) => template.id === selectedTemplateId) || null,
    [promptTemplates, selectedTemplateId],
  )

  const activeTemplateText =
    selectedTemplate?.normalizedPrompt || selectedTemplate?.normalizedDescription || ''

  const selectedContentPillar = useMemo(
    () => contentPillars.find((pillar) => pillar.id === selectedContentPillarId) || null,
    [contentPillars, selectedContentPillarId],
  )
  const normalizedResponseTopics = useMemo(
    () => responseTopics.map((topic, index) => normalizeGeneratedTopic(topic, index)),
    [responseTopics],
  )

  useEffect(() => {
    setTopicDrafts(normalizedResponseTopics)
    setSavedTopicIndices([])
    setSavingTopicIndices([])
  }, [normalizedResponseTopics])

  const canSubmitManual =
    Boolean(selectedContentPillarId) &&
    Boolean(selectedTemplateId) &&
    jumlahTopics >= 1 &&
    jumlahTopics <= maxTopics &&
    !isSubmitting &&
    !isLoadingTemplates

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
      setStatusMessage('Lengkapi template, content pillar, dan jumlah topic dulu.')
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
    setStatusMessage('Mengirim payload ke backend...')

    void generateContentTopics({
      contentPillarId: selectedContentPillarId,
      templateText: activeTemplateText,
      jumlahTopics,
      templateId: selectedTemplateId || undefined,
    })
      .then((rawData) => {
        const topics = extractTopicsFromWebhookResponse(rawData)
        const usage = extractTokenUsageFromWebhookResponse(rawData)

        setResponseTopics(topics)
        setTokenUsage(usage)
        setStatusTone('success')
        setStatusMessage('Payload berhasil dikirim ke backend.')
        toastSuccess('Generate request sent', 'Payload topic sudah dikirim ke backend.')
      })
      .catch((error) => {
        setStatusTone('error')
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengirim payload.'
        setStatusMessage(errorMessage)
        toastError('Generate request failed', errorMessage)
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
      setStatusMessage('Pilih content pillar yang valid dulu sebelum menyimpan topic.')
      return
    }

    if (!draft.categoryType.trim()) {
      setStatusTone('error')
      setStatusMessage(`Topic "${draft.title}" belum punya category untuk disimpan.`)
      return
    }

    setSavingTopicIndices((current) => (current.includes(index) ? current : [...current, index]))
    setStatusTone('idle')
    setStatusMessage(`Menyimpan topic "${draft.title}"...`)

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
      setStatusMessage(`Topic "${draft.title}" berhasil disimpan ke database.`)
      toastSuccess('Topic saved', `"${draft.title}" sudah masuk ke database.`)
    } catch (error) {
      setStatusTone('error')
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan topic.'
      setStatusMessage(errorMessage)
      toastError('Save topic failed', errorMessage)
    } finally {
      setSavingTopicIndices((current) => current.filter((savedIndex) => savedIndex !== index))
    }
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

  const filteredPillars = contentPillars
  const templateCards = promptTemplates

  return (
    <section className="generate-page">
      <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Generator</p>
          <h1>Generate content dari template, pillar, dan jumlah topic dalam satu panel.</h1>
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
                <p className="eyebrow">Prompt Templates</p>
                <h2>Pilih template default dari backend</h2>
              </div>
              <span className="pill subtle">{templateCards.length} loaded</span>
            </div>

            {isLoadingTemplates ? (
              <div className="generate-empty-state">
                <AppIcon name="sparkles" />
                <div>
                  <strong>Memuat prompt templates...</strong>
                  <p>GET list sedang diambil supaya card template bisa langsung dipilih.</p>
                </div>
              </div>
            ) : templateCards.length ? (
              <div className="generate-card-grid">
                {templateCards.map((template) => (
                  <TemplateCard
                    key={template.id || template.normalizedName}
                    template={template}
                    selected={template.id === selectedTemplateId}
                    onClick={(id) => setSelectedTemplateId(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="sparkles" />
                <div>
                  <strong>Belum ada template tersimpan</strong>
                  <p>Pastikan endpoint list prompt template sudah mengembalikan data.</p>
                </div>
              </div>
            )}
          </article>

          <article className="panel generate-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Content Pillars</p>
                <h2>Pilih pillar milik user aktif</h2>
              </div>
              <span className="pill subtle">{filteredPillars.length} pillar</span>
            </div>

            {isLoadingPillars ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Memuat content pillar...</strong>
                  <p>Sedang ambil daftar pillar yang bisa dipakai untuk generate.</p>
                </div>
              </div>
            ) : filteredPillars.length ? (
              <div className="generate-card-grid pillars-grid">
                {filteredPillars.map((pillar) => (
                  <PillarCard
                    key={pillar.id || getPillarTitle(pillar)}
                    pillar={pillar}
                    selected={pillar.id === selectedContentPillarId}
                    onClick={(id) => setSelectedContentPillarId(id)}
                  />
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
                <h2>Hasil dari webhook</h2>
              </div>
              <div className="generate-response-meta">
                {tokenUsage ? (
                  <span className="pill subtle">{tokenUsage.totalTokens} tokens used</span>
                ) : null}
                <span className="pill subtle">Live</span>
              </div>
            </div>

            {responseTopics.length ? (
              <div className="generate-response-stack">
                <div className="generate-topics-preview">
                  <div className="panel-heading compact">
                    <div>
                      <p className="eyebrow">Parsed Topics</p>
                      <h2>Topics</h2>
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
                            className="generate-topic-card"
                            key={`${normalizedTopic.title || topicLabel(sourceTopic, index)}-${index}`}
                          >
                            <span className="generate-topic-index">Topic {index + 1}</span>
                            <label className="generate-topic-field">
                              <span>Topic Title</span>
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
                              <span>Category</span>
                              <select
                                value={draft.categoryType}
                                onChange={(event) =>
                                  handleDraftChange(index, 'categoryType', event.target.value)
                                }
                              >
                                <option value="">Pilih category</option>
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
                            <div className="generate-topic-actions">
                              <button
                                className="ghost-button generate-topic-save-button"
                                type="button"
                                onClick={() => void handleSaveTopic(sourceTopic, index)}
                                disabled={
                                  isSaving ||
                                  isSaved ||
                                  !userId ||
                                  !selectedContentPillar?.id ||
                                  !draft.title.trim() ||
                                  !draft.categoryType.trim()
                                }
                              >
                                {isSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>

                    {tokenUsage ? (
                      <p className="generate-token-footnote">
                        Total tokens used: <strong>{tokenUsage.totalTokens}</strong>
                        {tokenUsage.promptTokens || tokenUsage.completionTokens
                          ? ` · prompt ${tokenUsage.promptTokens} · completion ${tokenUsage.completionTokens}`
                          : ''}
                      </p>
                    ) : null}
                  </div>
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="check" />
                <div>
                  <strong>Belum ada response</strong>
                  <p>Setelah request sukses, response dari N8N akan tampil di sini.</p>
                </div>
              </div>
            )}
          </article>
        </div>

        <aside className="generate-side-column">
          <form className="panel generate-panel generate-form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Generate Payload</p>
                <h2>Kirim langsung ke backend</h2>
              </div>
              <span className={`pill${canSubmitManual ? ' subtle' : ''}`}>
                {canSubmitManual ? 'Ready' : 'Needs setup'}
              </span>
            </div>

            <div className="generate-summary">
              <div className="generate-summary-item">
                <span>Template</span>
                <strong>{selectedTemplate?.normalizedName || 'Belum dipilih'}</strong>
              </div>
              <div className="generate-summary-item">
                <span>Content Pillar</span>
                <strong>
                  {selectedContentPillar ? getPillarTitle(selectedContentPillar) : 'Belum dipilih'}
                </strong>
              </div>
            </div>

            <label className="persona-field full-width">
              <span>Jumlah Topics</span>
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
                {isSubmitting ? 'Mengirim...' : 'Create Topics'}
              </button>
            </div>

            {/* <div className="generate-note">
              <AppIcon name="info" />
              <p>
                Template prompt mengikuti template default dari backend. Payload yang dikirim
                tetap `content_pillar_id`, `template_id`, `template_text`, dan `jumlah_topics`.
              </p>
            </div> */}
          </form>
        </aside>
      </section>
    </section>
  )
}
