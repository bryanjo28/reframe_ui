import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { getCurrentAuthToken } from '../services/authService'
import { createContentOutput } from '../services/contentOutputs'
import {
  getContentTopicById,
  listContentTopics,
  type ContentTopicRecord,
} from '../services/contentTopics'

type ManualPostPageProps = {
  userId: string
  onBackToContentEngine?: () => void
  onViewLibrary?: () => void
  embedded?: boolean
}

function getTopicValue(record: ContentTopicRecord | null, keys: string[]) {
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

function getTopicTitle(record: ContentTopicRecord) {
  return getTopicValue(record, ['topic', 'title', 'name']) || 'Untitled topic'
}

function getTopicCategory(record: ContentTopicRecord) {
  return getTopicValue(record, ['category', 'categoryType', 'category_type']) || 'Uncategorized'
}

function getTopicPillarReference(record: ContentTopicRecord) {
  return (
    getTopicValue(record, ['contentPillarId', 'content_pillar_id']) ||
    'Belum terhubung ke pillar'
  )
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

function getRecordTimestamp(record: ContentTopicRecord) {
  const raw = getTopicValue(record, ['usedAt', 'used_at', 'createdAt', 'created_at'])
  const parsed = raw ? Date.parse(raw) : Number.NaN

  return Number.isFinite(parsed) ? parsed : 0
}

function sortTopicsDescending(topics: ContentTopicRecord[]) {
  return [...topics].sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))
}

function isTopicOfUser(record: ContentTopicRecord, userId: string) {
  if (!userId) {
    return true
  }

  const ownerId = getTopicValue(record, ['userId', 'user_id'])

  return !ownerId || ownerId === userId
}

export function ManualPostPage({
  userId,
  onBackToContentEngine,
  onViewLibrary,
  embedded = false,
}: ManualPostPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [topics, setTopics] = useState<ContentTopicRecord[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [detailTopic, setDetailTopic] = useState<ContentTopicRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, setIsLoadingDetail] = useState(false)
  const [isGeneratingOutput, setIsGeneratingOutput] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [contentOutputPreviews, setContentOutputPreviews] = useState<string[]>([])
  const [variantCount, setVariantCount] = useState(1)
  const [additionalPrompt, setAdditionalPrompt] = useState('')

  const accessToken = getCurrentAuthToken() || ''

  async function loadTopics(selectFirst = false) {
    setIsLoading(true)
    setStatusMessage('')
    setStatusTone('idle')

    try {
      const records = await listContentTopics()
      const ownedTopics = sortTopicsDescending(records.filter((record) => isTopicOfUser(record, userId)))

      setTopics(ownedTopics)

      if (selectFirst || !selectedTopicId) {
        const nextSelected = ownedTopics[0] || null
        setSelectedTopicId(nextSelected?.id || '')
        setDetailTopic(nextSelected)
      }

      return true
    } catch (error) {
      setTopics([])
      setDetailTopic(null)
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat content topics.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Load topics failed', errorMessage)
      return false
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void loadTopics(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const categories = useMemo(() => {
    const unique = new Set<string>()

    for (const topic of topics) {
      unique.add(getTopicCategory(topic))
    }

    return ['all', ...Array.from(unique)]
  }, [topics])

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return topics.filter((topic) => {
      const category = getTopicCategory(topic)
      const matchesCategory = categoryFilter === 'all' || category === categoryFilter
      const matchesQuery =
        !query ||
        [getTopicTitle(topic), category, getTopicPillarReference(topic)]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesCategory && matchesQuery
    })
  }, [topics, searchQuery, categoryFilter])

  const selectedTopic = useMemo(
    () => filteredTopics.find((topic) => topic.id === selectedTopicId) || detailTopic || null,
    [detailTopic, filteredTopics, selectedTopicId],
  )

  useEffect(() => {
    if (!selectedTopic) {
      setAdditionalPrompt('')
      return
    }

    setAdditionalPrompt(getTopicValue(selectedTopic, ['additionalPrompt', 'additional_prompt']))
  }, [selectedTopic])

  async function handleOpenDetail(id: string) {
    setSelectedTopicId(id)
    setIsLoadingDetail(true)
    setStatusMessage('')
    setStatusTone('idle')

    try {
      const record = await getContentTopicById(id)
      setDetailTopic(record)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat detail topic.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Load topic detail failed', errorMessage)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function unwrapPreviewResponse(response: unknown): string[] {
    if (typeof response === 'string') {
      return response.trim() ? [response] : []
    }

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const record = response as Record<string, unknown>
      if (Array.isArray(record.contents)) {
        return record.contents.filter((content): content is string => typeof content === 'string' && Boolean(content.trim()))
      }

      if (Array.isArray(record.data)) {
        const contents = record.data.flatMap((item) => {
          if (typeof item === 'string' && item.trim()) {
            return [item]
          }

          if (item && typeof item === 'object') {
            const itemRecord = item as Record<string, unknown>
            const content = itemRecord.content ?? itemRecord.contentOutput ?? itemRecord.content_output
            return typeof content === 'string' && content.trim() ? [content] : []
          }

          return []
        })

        if (contents.length) {
          return contents
        }
      }

      const candidates = [
        record.contentOutput,
        record.content_output,
        record.output,
        record.result,
      ]

      for (const candidate of candidates) {
        if (typeof candidate === 'string') {
          return candidate.trim() ? [candidate] : []
        }

        if (candidate && typeof candidate === 'object') {
          return [JSON.stringify(candidate, null, 2)]
        }
      }

      return [JSON.stringify(record, null, 2)]
    }

    return []
  }

  async function handleGenerateContentOutput() {
    if (!selectedTopic?.id) {
      setStatusTone('error')
      setStatusMessage('Pilih topic dulu sebelum generate content manual.')
      return
    }

    if (!accessToken) {
      setStatusTone('error')
      setStatusMessage('Auth token belum tersedia. Silakan login ulang dulu.')
      return
    }

    setIsGeneratingOutput(true)
    setStatusTone('idle')
    setStatusMessage(`Generate content manual untuk "${getTopicTitle(selectedTopic)}"...`)
    setContentOutputPreviews([])

    try {
      const rawResponse = await createContentOutput({
        topicId: selectedTopic.id,
        variantCount,
        additionalPrompt: additionalPrompt.trim(),
      })

      const previews = unwrapPreviewResponse(rawResponse)

      setContentOutputPreviews(previews)
      setStatusTone('success')
      setStatusMessage(`${variantCount} content variant untuk "${getTopicTitle(selectedTopic)}" berhasil dibuat.`)
      toastSuccess('Content generated', `${variantCount} variant berhasil dibuat.`)
    } catch (error) {
      setStatusTone('error')
      const errorMessage = error instanceof Error ? error.message : 'Gagal generate content.'
      setStatusMessage(errorMessage)
      toastError('Generate content failed', errorMessage)
    } finally {
      setIsGeneratingOutput(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    const loaded = await loadTopics(false)

    if (loaded) {
      toastSuccess('Topics refreshed', 'Daftar topic berhasil diperbarui.')
    }
  }

  function selectTopicFromTable(id: string) {
    const topic = topics.find((item) => item.id === id) || null

    setSelectedTopicId(id)
    setDetailTopic(topic)
    void handleOpenDetail(id)
  }

  return (
    <section className={embedded ? 'topic-variants-workspace' : 'generate-page'}>
      {!embedded ? <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Scheduler</p>
          <h1>Auto post dulu lihat topic yang tersedia, lalu pilih mana yang mau diproses.</h1>
          <p className="page-description">
            Topic disajikan dalam tabel yang sederhana supaya user awam bisa scan cepat,
            cari berdasarkan judul, dan buka detail topic sebelum masuk ke flow schedule.
          </p>
        </div>
      </header> : null}

      {!embedded ? <div className="generate-mode-switcher">
        <span className="pill subtle">Manual mode</span>
        <button
          className="ghost-button generate-mode-button manual-flow-button"
          type="button"
          onClick={onBackToContentEngine}
        >
          Change flow
        </button>
      </div> : null}

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <AppIcon name={statusTone === 'success' ? 'check' : 'info'} />
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className="auto-post-layout">
        <div className="auto-post-main-column">
          <article className="panel table-panel auto-post-table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Topic Library</p>
              <h2>Daftar content topic</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => void handleRefresh()} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="auto-post-toolbar">
            <label className="auto-post-search">
              <span>Cari topic</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ketik judul topic, category, atau pillar..."
              />
            </label>

            <div className="auto-post-chip-row" aria-label="Filter kategori topic">
              {categories.map((category) => {
                const isActive = categoryFilter === category

                return (
                  <button
                    key={category}
                    type="button"
                    className={`chip${isActive ? ' active' : ''}`}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category === 'all' ? 'All categories' : category}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="table-wrap">
            <table className="auto-post-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Category</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="table-empty-cell">
                      <div className="generate-empty-state">
                        <AppIcon name="info" />
                        <div>
                          <strong>Memuat topic...</strong>
                          <p>Sedang mengambil data content topic dari database.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredTopics.length ? (
                  filteredTopics.map((topic) => {
                    const isSelected = topic.id && topic.id === selectedTopicId

                    return (
                      <tr key={topic.id || getTopicTitle(topic)} className={isSelected ? 'selected-row' : ''}>
                        <td>
                          <button
                            className="table-link-button"
                            type="button"
                            onClick={() => topic.id && selectTopicFromTable(topic.id)}
                          >
                            {getTopicTitle(topic)}
                          </button>
                        </td>
                        <td>
                          <span className="status-badge draft">{getTopicCategory(topic)}</span>
                        </td>
                        <td>{formatDate(getTopicValue(topic, ['createdAt', 'created_at']))}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="table-empty-cell">
                      <div className="generate-empty-state">
                        <AppIcon name="layers" />
                        <div>
                          <strong>Belum ada topic yang cocok</strong>
                          <p>Coba ubah kata kunci pencarian atau pilih category lain.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </article>

          <article className="panel auto-post-response-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Manual Generate</p>
                <h2>Response backend</h2>
              </div>
              <span className={`pill${contentOutputPreviews.length ? ' subtle' : ''}`}>
                {contentOutputPreviews.length ? `${contentOutputPreviews.length} variants` : 'Waiting'}
              </span>
            </div>

            {contentOutputPreviews.length ? (
              <div className="content-variant-results">
                {contentOutputPreviews.map((content, index) => (
                  <article className="content-variant-result" key={`${index}-${content.slice(0, 24)}`}>
                    <span>Variant {index + 1}</span>
                    <p>{content}</p>
                  </article>
                ))}
                {onViewLibrary ? (
                  <button className="ghost-button" type="button" onClick={onViewLibrary}>
                    View in Content Library
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Belum ada variant</strong>
                  <p>
                    Pilih topic, tentukan jumlah variant, lalu generate untuk melihat hasilnya.
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>

        <aside className="auto-post-side-column">
          <article className="panel auto-post-detail-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Topic Detail</p>
                <h2>{selectedTopic ? getTopicTitle(selectedTopic) : 'Pilih topic dulu'}</h2>
              </div>
              <span className={`pill${selectedTopic ? ' subtle' : ''}`}>
                {selectedTopic ? 'Selected' : 'Empty'}
              </span>
            </div>

            {selectedTopic ? (
              <div className="auto-post-detail-stack">
                <div className="auto-post-detail-card">
                  <span>Category</span>
                  <strong>{getTopicCategory(selectedTopic)}</strong>
                </div>
                <div className="auto-post-detail-card">
                  <span>Content Pillar</span>
                  <strong>{getTopicValue(selectedTopic, ['pillarName', 'pillar_name']) || 'Tersambung ke pillar'}</strong>
                </div>
                <div className="auto-post-detail-card">
                  <span>Topic Text</span>
                  <p>{getTopicTitle(selectedTopic)}</p>
                </div>
                <div className="auto-post-detail-card">
                  <span>Used At</span>
                  <p>{formatDate(getTopicValue(selectedTopic, ['usedAt', 'used_at']))}</p>
                </div>
                <div className="auto-post-detail-card">
                  <span>Created At</span>
                  <p>{formatDate(getTopicValue(selectedTopic, ['createdAt', 'created_at']))}</p>
                </div>

                <label className="persona-field full-width">
                  <span>Jumlah Variant</span>
                  <div className="topic-stepper">
                    <button
                      className="stepper-button"
                      type="button"
                      onClick={() => setVariantCount((current) => Math.max(1, current - 1))}
                      disabled={variantCount <= 1}
                      aria-label="Kurangi jumlah variant"
                    >
                      <AppIcon name="minus" />
                    </button>
                    <input type="number" min={1} max={5} value={variantCount} readOnly />
                    <button
                      className="stepper-button"
                      type="button"
                      onClick={() => setVariantCount((current) => Math.min(5, current + 1))}
                      disabled={variantCount >= 5}
                      aria-label="Tambah jumlah variant"
                    >
                      <AppIcon name="plus" />
                    </button>
                  </div>
                  <small className="field-hint">Maksimal 5 angle berbeda untuk satu topic.</small>
                </label>

                <label className="persona-field full-width">
                  <span>Instruksi Tambahan <small>(opsional)</small></span>
                  <textarea
                    value={additionalPrompt}
                    onChange={(event) => setAdditionalPrompt(event.target.value)}
                    placeholder="Tonenya lebih santai dan tambahkan CTA yang natural."
                    rows={3}
                  />
                </label>

                <div className="auto-post-note">
                  <AppIcon name="info" />
                  <p>
                    Setiap variant akan memakai angle yang berbeda agar hasilnya tidak repetitif.
                  </p>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void handleGenerateContentOutput()}
                  disabled={!selectedTopic?.id || isGeneratingOutput || !accessToken}
                >
                  {isGeneratingOutput ? 'Generating...' : `Generate ${variantCount} Variant${variantCount > 1 ? 's' : ''}`}
                </button>
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="check" />
                <div>
                  <strong>Belum ada topic dipilih</strong>
                  <p>Klik salah satu baris tabel untuk lihat detail topic di panel ini.</p>
                </div>
              </div>
            )}
          </article>
        </aside>
      </section>
    </section>
  )
}
