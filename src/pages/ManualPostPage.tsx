import { useEffect, useMemo, useRef, useState } from 'react'
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
  embedded?: boolean
  onGenerated?: () => void
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
  const raw = getTopicValue(record, ['createdAt', 'created_at'])
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

export function ManualPostPage({ userId, onBackToContentEngine, embedded = false, onGenerated }: ManualPostPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [topics, setTopics] = useState<ContentTopicRecord[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [detailTopic, setDetailTopic] = useState<ContentTopicRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isTopicPickerOpen, setIsTopicPickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, setIsLoadingDetail] = useState(false)
  const [isGeneratingOutput, setIsGeneratingOutput] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [variantCount, setVariantCount] = useState(1)
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const generationLockRef = useRef(false)

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
        [getTopicTitle(topic), category]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesCategory && matchesQuery
    })
  }, [topics, searchQuery, categoryFilter])

  const topicsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(filteredTopics.length / topicsPerPage))
  const paginatedTopics = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * topicsPerPage
    return filteredTopics.slice(start, start + topicsPerPage)
  }, [currentPage, filteredTopics, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter])

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages))
  }, [totalPages])

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

  async function handleGenerateContentOutput() {
    if (generationLockRef.current) {
      return
    }

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

    generationLockRef.current = true
    setIsGeneratingOutput(true)
    setStatusTone('idle')
    setStatusMessage(`Generate content manual untuk "${getTopicTitle(selectedTopic)}"...`)

    try {
      await createContentOutput({
        topicId: selectedTopic.id,
        variantCount,
        additionalPrompt: additionalPrompt.trim(),
      })
      setStatusTone('success')
      setStatusMessage(`${variantCount} variant untuk "${getTopicTitle(selectedTopic)}" berhasil dibuat.`)
      toastSuccess('Konten berhasil dibuat', `${variantCount} variant siap untuk direview.`)
      onGenerated?.()
    } catch (error) {
      setStatusTone('error')
      const errorMessage = error instanceof Error ? error.message : 'Gagal generate content.'
      setStatusMessage(errorMessage)
      toastError('Generate content failed', errorMessage)
    } finally {
      generationLockRef.current = false
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
    setIsTopicPickerOpen(false)
    void handleOpenDetail(id)
  }

  return (
    <section className={`generate-page manual-topic-flow${embedded ? ' embedded' : ''}`}>
      {!embedded ? <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Content Engine</p>
          <h1>Buat variant dari satu topic</h1>
          <p className="page-description">
            Pilih satu topic lalu buat hingga lima angle konten yang berbeda.
          </p>
        </div>
      </header> : (
        <div className="topic-variant-intro">
          <div>
            <p className="eyebrow">From Topic</p>
            <h2>Buat variant dari satu topic</h2>
            <p>Pilih ide yang paling kuat, lalu tentukan jumlah angle yang ingin dibuat.</p>
          </div>
          <span className="pill subtle">Maks. 5 variant</span>
        </div>
      )}

      {!embedded ? <div className="generate-mode-switcher">
        <span className="pill subtle">Manual mode</span>
        {onBackToContentEngine ? <button
          className="ghost-button generate-mode-button manual-flow-button"
          type="button"
          onClick={onBackToContentEngine}
        >
          Change flow
        </button> : null}
      </div> : null}

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <AppIcon name={statusTone === 'success' ? 'check' : 'info'} />
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <div className="mobile-selected-topic">
        <div>
          <span>Topic terpilih</span>
          <strong>{selectedTopic ? getTopicTitle(selectedTopic) : 'Belum ada topic dipilih'}</strong>
          {selectedTopic ? <small>{getTopicCategory(selectedTopic)} · {formatDate(getTopicValue(selectedTopic, ['createdAt', 'created_at']))}</small> : null}
        </div>
        <button className="ghost-button" type="button" onClick={() => setIsTopicPickerOpen(true)}>
          {selectedTopic ? 'Ganti Topic' : 'Pilih Topic'}
        </button>
      </div>

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

          <div className="table-wrap topic-table-wrap">
            <table className="auto-post-table" aria-label="Daftar topic">
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
                  paginatedTopics.map((topic) => {
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
          {filteredTopics.length > topicsPerPage ? (
            <div className="table-pagination topic-pagination" aria-label="Pagination topic">
              <button
                className="ghost-button table-pagination-button"
                type="button"
                aria-label="Halaman sebelumnya"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
              >
                <AppIcon name="chevron-left" />
              </button>
              <span>Halaman {currentPage} dari {totalPages}</span>
              <button
                className="ghost-button table-pagination-button"
                type="button"
                aria-label="Halaman berikutnya"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
              >
                <AppIcon name="chevron-right" />
              </button>
            </div>
          ) : null}
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
                  <span>Topic Text</span>
                  <p>{getTopicTitle(selectedTopic)}</p>
                </div>
                <div className="auto-post-detail-card">
                  <span>Created At</span>
                  <p>{formatDate(getTopicValue(selectedTopic, ['createdAt', 'created_at']))}</p>
                </div>

                <label className="persona-field full-width">
                  <span>Jumlah variant</span>
                  <div className="topic-stepper">
                    <button
                      className="stepper-button"
                      type="button"
                      onClick={() => setVariantCount((current) => Math.max(1, current - 1))}
                      disabled={variantCount <= 1 || isGeneratingOutput}
                      aria-label="Kurangi jumlah variant"
                    >
                      <AppIcon name="minus" />
                    </button>
                    <input aria-label="Jumlah variant" type="number" min={1} max={5} value={variantCount} readOnly />
                    <button
                      className="stepper-button"
                      type="button"
                      onClick={() => setVariantCount((current) => Math.min(5, current + 1))}
                      disabled={variantCount >= 5 || isGeneratingOutput}
                      aria-label="Tambah jumlah variant"
                    >
                      <AppIcon name="plus" />
                    </button>
                  </div>
                  <small className="field-hint">Maksimal lima angle berbeda dari satu topic.</small>
                </label>

                <label className="persona-field full-width">
                  <span>Instruksi tambahan <small>(opsional)</small></span>
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
                    Setiap variant memakai angle berbeda agar hasil tidak repetitif.
                  </p>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void handleGenerateContentOutput()}
                  disabled={!selectedTopic?.id || isGeneratingOutput || !accessToken}
                >
                  {isGeneratingOutput ? 'Sedang membuat variant...' : `Generate ${variantCount} Variant${variantCount > 1 ? 's' : ''}`}
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

      {isTopicPickerOpen ? (
        <div className="topic-picker-backdrop" onClick={() => setIsTopicPickerOpen(false)}>
          <section className="topic-picker-sheet" role="dialog" aria-modal="true" aria-label="Pilih topic" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">Topic Library</p>
                <h2>Pilih satu topic</h2>
              </div>
              <button type="button" aria-label="Tutup pemilih topic" onClick={() => setIsTopicPickerOpen(false)}>×</button>
            </header>
            <label className="auto-post-search">
              <span>Cari topic</span>
              <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Cari berdasarkan judul atau category..." />
            </label>
            <div className="auto-post-chip-row" aria-label="Filter kategori topic mobile">
              {categories.map((category) => (
                <button key={category} type="button" className={`chip${categoryFilter === category ? ' active' : ''}`} onClick={() => setCategoryFilter(category)}>
                  {category === 'all' ? 'Semua' : category}
                </button>
              ))}
            </div>
            <div className="topic-picker-list">
              {paginatedTopics.map((topic) => (
                <button key={topic.id || getTopicTitle(topic)} type="button" className={topic.id === selectedTopicId ? 'selected' : ''} aria-label={`Pilih ${getTopicTitle(topic)}`} onClick={() => topic.id && selectTopicFromTable(topic.id)}>
                  <span className="status-badge draft">{getTopicCategory(topic)}</span>
                  <strong>{getTopicTitle(topic)}</strong>
                  <small>{formatDate(getTopicValue(topic, ['createdAt', 'created_at']))}</small>
                </button>
              ))}
            </div>
            {filteredTopics.length > topicsPerPage ? (
              <div className="topic-picker-pagination">
                <button type="button" className="ghost-button" aria-label="Halaman sebelumnya mobile" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>Sebelumnya</button>
                <span>{currentPage} / {totalPages}</span>
                <button type="button" className="ghost-button" aria-label="Halaman berikutnya mobile" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>Berikutnya</button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isGeneratingOutput ? (
        <div className="topic-variant-loading" role="status" aria-live="polite">
          <span className="topic-variant-spinner" aria-hidden="true" />
          <div>
            <strong>Sedang membuat {variantCount} variant</strong>
            <span>Jangan tutup halaman ini. Hasil akan muncul otomatis.</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}
