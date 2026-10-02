import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import {
  autoGenerateContentOutputs,
  deleteContentOutput,
  getScheduledJobId,
  listContentOutputs,
  retryContentOutputPost,
  updateContentOutput,
  type ContentOutputRecord,
} from '../services/contentOutputs'
import { listContentPillars, type ContentPillarRecord } from '../services/contentPillars'
import { listContentTopics, type ContentTopicRecord } from '../services/contentTopics'
import { ManualPostPage } from './ManualPostPage'

type ContentEnginePageProps = {
  userId: string
  outputsRefreshKey?: number
  onScheduledJobCreated?: (jobId: string, targetCount: number) => void
}

type ContentEngineView = 'auto' | 'list'
type ContentCreationMode = 'batch' | 'topic-variants'
type ThreadTypeFilter = 'all' | 'short' | 'long'
type OutputEditForm = {
  platform: string
  status: string
  content: string
}

const outputsPerPage = 5
const THREAD_SPLIT_DELIMITER = '---THREAD_SPLIT---'
const MAX_THREAD_PARTS = 8
const MAX_THREAD_CHARACTERS = 500

function parseThreadParts(content: string) {
  return content.split(THREAD_SPLIT_DELIMITER).map((part) => part.trim())
}

function serializeThreadParts(parts: string[]) {
  return parts.map((part) => part.trim()).join(`\n\n${THREAD_SPLIT_DELIMITER}\n\n`)
}

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

function getOutputTitle(record: ContentOutputRecord | null) {
  return (
    getOutputValue(record, ['title']) ||
    getOutputValue(record, ['topic']) ||
    getOutputValue(record, ['topicId', 'topic_id']) ||
    'Untitled output'
  )
}

function getOutputContent(record: ContentOutputRecord | null) {
  return (
    getOutputValue(record, ['content', 'contentText', 'content_text']) ||
    getOutputValue(record, ['contentOutput', 'content_output']) ||
    getOutputValue(record, ['output']) ||
    getOutputValue(record, ['result']) ||
    'Belum ada preview output.'
  )
}

function getOutputStatus(record: ContentOutputRecord | null) {
  const externalPostId = getOutputValue(record, ['externalPostId', 'external_post_id'])

  if (externalPostId) {
    return 'posted'
  }

  return (
    getOutputValue(record, ['status', 'contentStatus', 'content_status', 'state', 'post_status']) ||
    'draft'
  )
}

function formatStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase()

  if (!normalized) {
    return 'Draft'
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function canEditOutputStatus(status: string) {
  return status.trim().toLowerCase() !== 'posted'
}

function canDeleteOutputStatus(status: string) {
  return status.trim().toLowerCase() !== 'posted'
}

function canRetryOutputStatus(status: string) {
  return status.trim().toLowerCase() === 'failed'
}

function normalizeDatetimeLocal(value: string) {
  if (!value.trim()) {
    return ''
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)

  if (!match) {
    return ''
  }

  const [, year, month, day, hour, minute] = match
  const asDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))

  if (Number.isNaN(asDate.getTime())) {
    return ''
  }

  return asDate.toISOString()
}

function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getOutputEditForm(record: ContentOutputRecord | null): OutputEditForm {
  return {
    platform: getOutputValue(record, ['platform']) || 'threads',
    status: getOutputStatus(record),
    content: getOutputContent(record),
  }
}

function getOutputId(record: ContentOutputRecord) {
  const id = typeof record.id === 'string' ? record.id.trim() : ''

  if (!id || id === 'null' || id === 'undefined') {
    return ''
  }

  return id
}

function normalizeOutputId(id: string) {
  const trimmed = typeof id === 'string' ? id.trim() : ''

  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return ''
  }

  return trimmed
}

function getOutputPreview(record: ContentOutputRecord, limit = 140) {
  const text = getOutputContent(record)

  if (text.length <= limit) {
    return text
  }

  return `${text.slice(0, limit).trim()}...`
}

function getTopicPillarId(record: ContentTopicRecord) {
  return (
    (typeof record.contentPillarId === 'string' && record.contentPillarId.trim()) ||
    (typeof record.content_pillar_id === 'string' && record.content_pillar_id.trim()) ||
    ''
  )
}

function getTopicLabel(record: ContentTopicRecord) {
  return (
    (typeof record.topic === 'string' && record.topic.trim()) ||
    (typeof record.category === 'string' && record.category.trim()) ||
    'Untitled topic'
  )
}

function isUnusedTopic(record: ContentTopicRecord) {
  const candidates = [record.usedAt, record.used_at]

  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate === 0
    }

    if (typeof candidate === 'string') {
      const normalized = candidate.trim().toLowerCase()

      if (!normalized) {
        return true
      }

      return normalized === '0'
    }
  }

  return true
}

export function ContentEnginePage({
  userId,
  outputsRefreshKey: externalOutputsRefreshKey = 0,
  onScheduledJobCreated,
}: ContentEnginePageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const pillarsRailRef = useRef<HTMLDivElement | null>(null)
  const [contentPillars, setContentPillars] = useState<ContentPillarRecord[]>([])
  const [selectedContentPillarId, setSelectedContentPillarId] = useState('')
  const [targetCount, setTargetCount] = useState(10)
  const [viewMode, setViewMode] = useState<ContentEngineView>('auto')
  const [creationMode, setCreationMode] = useState<ContentCreationMode>('batch')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoadingPillars, setIsLoadingPillars] = useState(true)
  const [isLoadingOutputs, setIsLoadingOutputs] = useState(false)
  const [outputsRefreshKey, setOutputsRefreshKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contentTopics, setContentTopics] = useState<ContentTopicRecord[]>([])
  const [isLoadingTopics, setIsLoadingTopics] = useState(true)
  const [contentOutputs, setContentOutputs] = useState<ContentOutputRecord[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState('')
  const [isOutputEditorOpen, setIsOutputEditorOpen] = useState(false)
  const [isSavingOutput, setIsSavingOutput] = useState(false)
  const [isDeletingOutputId, setIsDeletingOutputId] = useState('')
  const [currentOutputsPage, setCurrentOutputsPage] = useState(1)
  const [threadTypeFilter, setThreadTypeFilter] = useState<ThreadTypeFilter>('all')
  const [retryingOutputId, setRetryingOutputId] = useState('')
  const [retryModalOutputId, setRetryModalOutputId] = useState('')
  const [retryScheduledAt, setRetryScheduledAt] = useState('')
  const [outputEditForm, setOutputEditForm] = useState<OutputEditForm>(getOutputEditForm(null))
  const [threadParts, setThreadParts] = useState<string[]>([''])
  const [isThreadSplitEditor, setIsThreadSplitEditor] = useState(false)

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

    async function loadTopics() {
      setIsLoadingTopics(true)

      try {
        const topics = await listContentTopics()

        if (!isMounted) {
          return
        }

        setContentTopics(topics)
      } catch {
        if (isMounted) {
          setContentTopics([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingTopics(false)
        }
      }
    }

    void loadTopics()

    return () => {
      isMounted = false
    }
  }, [])

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
        setCurrentOutputsPage(1)
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
  }, [userId, viewMode, outputsRefreshKey, externalOutputsRefreshKey])

  const selectedContentPillar = useMemo(
    () => contentPillars.find((pillar) => pillar.id === selectedContentPillarId) || null,
    [contentPillars, selectedContentPillarId],
  )
  const selectedPillarTopics = useMemo(() => {
    if (!selectedContentPillarId) {
      return []
    }

    return contentTopics.filter((topic) => {
      return getTopicPillarId(topic) === selectedContentPillarId && isUnusedTopic(topic)
    })
  }, [contentTopics, selectedContentPillarId])

  const selectedContentOutput = useMemo(
    () => contentOutputs.find((output) => output.id === selectedOutputId) || null,
    [contentOutputs, selectedOutputId],
  )
  const selectedOutputTitle = useMemo(() => {
    if (!selectedContentOutput) {
      return 'Untitled output'
    }

    const directTitle = getOutputValue(selectedContentOutput, ['title', 'topic'])

    if (directTitle) {
      return directTitle
    }

    const topicId = getOutputValue(selectedContentOutput, ['topicId', 'topic_id'])
    const topic = contentTopics.find((record) => record.id === topicId)

    return topic ? getTopicLabel(topic) : 'Untitled output'
  }, [contentTopics, selectedContentOutput])
  const retryModalOutput = useMemo(
    () => contentOutputs.find((output) => output.id === retryModalOutputId) || null,
    [contentOutputs, retryModalOutputId],
  )
  const selectedOutputStatus = getOutputStatus(selectedContentOutput)
  const canChangeSelectedOutputStatus = canEditOutputStatus(selectedOutputStatus)

  function getOutputThreadType(record: ContentOutputRecord): Exclude<ThreadTypeFilter, 'all'> {
    const content = getOutputContent(record)

    if (content.includes(THREAD_SPLIT_DELIMITER)) {
      return 'long'
    }

    const directType = getOutputValue(record, ['threadType', 'thread_type']).toLowerCase()

    if (directType === 'long' || directType === 'short') {
      return directType
    }

    const topicId = getOutputValue(record, ['topicId', 'topic_id'])
    const topic = contentTopics.find((item) => item.id === topicId)
    const pillarId = topic ? getTopicPillarId(topic) : ''
    const pillar = contentPillars.find((item) => item.id === pillarId)

    return pillar?.threadType === 'long' ? 'long' : 'short'
  }

  const filteredContentOutputs = useMemo(
    () => threadTypeFilter === 'all'
      ? contentOutputs
      : contentOutputs.filter((record) => getOutputThreadType(record) === threadTypeFilter),
    // The lookup intentionally follows output -> topic -> pillar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentOutputs, contentPillars, contentTopics, threadTypeFilter],
  )
  const totalOutputPages = Math.max(1, Math.ceil(filteredContentOutputs.length / outputsPerPage))
  const paginatedOutputs = useMemo(() => {
    const startIndex = (currentOutputsPage - 1) * outputsPerPage
    return filteredContentOutputs.slice(startIndex, startIndex + outputsPerPage)
  }, [filteredContentOutputs, currentOutputsPage])

  useEffect(() => {
    if (!isOutputEditorOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOutputEditorOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOutputEditorOpen])

  useEffect(() => {
    if (!isOutputEditorOpen || !selectedContentOutput) {
      return
    }

    const nextForm = getOutputEditForm(selectedContentOutput)

    setOutputEditForm({
      ...nextForm,
      status: nextForm.status.trim().toLowerCase(),
    })
    setThreadParts(parseThreadParts(nextForm.content))
    setIsThreadSplitEditor(
      nextForm.platform.trim().toLowerCase() === 'threads' &&
      getOutputThreadType(selectedContentOutput) === 'long',
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOutputEditorOpen, selectedContentOutput, contentPillars, contentTopics])

  useEffect(() => {
    setCurrentOutputsPage((current) => Math.min(current, totalOutputPages))
  }, [totalOutputPages])

  useEffect(() => {
    setCurrentOutputsPage(1)
  }, [threadTypeFilter])

  const canSubmit =
    Boolean(selectedContentPillarId) &&
    selectedPillarTopics.length > 0 &&
    selectedPillarTopics.length >= targetCount &&
    targetCount >= 1 &&
    targetCount <= 10 &&
    !isSubmitting &&
    !isLoadingPillars

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      setStatusTone('error')
      setStatusMessage(
        selectedContentPillarId && selectedPillarTopics.length === 0
          ? 'Topic available untuk pillar ini masih 0.'
          : selectedContentPillarId && selectedPillarTopics.length < targetCount
            ? `Topic available untuk pillar ini cuma ${selectedPillarTopics.length}, lebih kecil dari target ${targetCount}.`
          : 'Pilih pillar dan tentukan jumlah content yang ingin dibuat.',
      )
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage('Memulai proses generate content...')
    void autoGenerateContentOutputs({
      contentPillarId: selectedContentPillarId,
      targetCount,
      scheduledAt: new Date().toISOString(),
    })
      .then((response) => {
        const jobId = getScheduledJobId(response)

        if (!jobId) {
          throw new Error('Proses berhasil dimulai, tetapi job ID tidak ditemukan.')
        }

        onScheduledJobCreated?.(jobId, targetCount)
        setStatusTone('success')
        setStatusMessage('Generate content sedang diproses. Hasil akan masuk ke Content Library.')
        toastSuccess('Generate content dimulai', 'Hasil akan masuk ke Content Library.')
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

  function openOutputEditor(id: string) {
    if (!id || id === 'null' || id === 'undefined') {
      return
    }

    console.log('[ContentEngine] openOutputEditor', { id })
    setSelectedOutputId(id)
    setIsOutputEditorOpen(true)
    setStatusMessage('')
    setStatusTone('idle')
  }

  function closeOutputEditor() {
    setIsOutputEditorOpen(false)
    setIsSavingOutput(false)
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

  function handleOutputFieldChange(field: keyof OutputEditForm, value: string) {
    setOutputEditForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleThreadPartChange(index: number, value: string) {
    setThreadParts((current) => current.map((part, partIndex) => partIndex === index ? value : part))
  }

  function addThreadPart() {
    setThreadParts((current) => current.length >= MAX_THREAD_PARTS ? current : [...current, ''])
  }

  function removeThreadPart(index: number) {
    setThreadParts((current) => current.length <= 1 ? current : current.filter((_, partIndex) => partIndex !== index))
  }

  function moveThreadPart(index: number, direction: -1 | 1) {
    setThreadParts((current) => {
      const targetIndex = index + direction

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  function openRetryModal(record: ContentOutputRecord) {
    const outputId = getOutputId(record)

    if (!outputId) {
      return
    }

    setRetryModalOutputId(outputId)
    setRetryScheduledAt(toDatetimeLocalValue(new Date(Date.now() + 5 * 60 * 1000)))
  }

  function closeRetryModal() {
    if (retryingOutputId) {
      return
    }

    setRetryModalOutputId('')
    setRetryScheduledAt('')
  }

  async function saveOutput(nextStatus = outputEditForm.status) {
    const selectedOutputIdValue = normalizeOutputId(selectedOutputId)
    const nextContent = isThreadSplitEditor
      ? serializeThreadParts(threadParts)
      : outputEditForm.content.trim()
    const payload = {
      id: selectedOutputIdValue,
      status: nextStatus.trim(),
      content: nextContent,
    }

    console.log('[ContentEngine] handleSaveOutput', {
      selectedOutputId,
      selectedOutputIdValue,
      selectedContentOutputId: selectedContentOutput?.id,
      payload,
    })

    if (!selectedOutputIdValue) {
      setStatusTone('error')
      setStatusMessage('Output yang dipilih tidak valid.')
      return
    }

    if (isThreadSplitEditor && threadParts.some((part) => !part.trim())) {
      setStatusTone('error')
      setStatusMessage('Setiap bagian thread harus memiliki isi sebelum disimpan.')
      return
    }

    setIsSavingOutput(true)
    setStatusTone('idle')
    setStatusMessage('Menyimpan perubahan output...')

    try {
      await updateContentOutput(selectedOutputIdValue, payload)

      const statusChanged = nextStatus !== outputEditForm.status
      toastSuccess(
        statusChanged ? 'Status updated' : 'Output updated',
        nextStatus === 'approved'
          ? 'Thread sudah disetujui dan siap digunakan di Auto Post.'
          : nextStatus === 'draft'
            ? 'Thread dikembalikan ke draft.'
            : 'Perubahan output sudah tersimpan.',
      )
      setStatusTone('success')
      setStatusMessage('Output berhasil diupdate.')
      setIsOutputEditorOpen(false)
      setOutputsRefreshKey((current) => current + 1)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah output.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Update output failed', errorMessage)
    } finally {
      setIsSavingOutput(false)
    }
  }

  function handleSaveOutput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveOutput()
  }

  async function handleDeleteOutput(record: ContentOutputRecord) {
    const outputId = getOutputId(record)
    const status = getOutputStatus(record)

    if (!outputId || !canDeleteOutputStatus(status)) {
      return
    }

    const shouldDelete = window.confirm(`Hapus output "${getOutputTitle(record)}"?`)

    if (!shouldDelete) {
      return
    }

    setIsDeletingOutputId(outputId)
    setStatusTone('idle')
    setStatusMessage('Menghapus output...')

    try {
      await deleteContentOutput(outputId)

      if (selectedOutputId === outputId) {
        setIsOutputEditorOpen(false)
        setSelectedOutputId('')
      }

      toastSuccess('Output deleted', 'Output berhasil dihapus.')
      setStatusTone('success')
      setStatusMessage('Output berhasil dihapus.')
      setOutputsRefreshKey((current) => current + 1)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus output.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Delete output failed', errorMessage)
    } finally {
      setIsDeletingOutputId('')
    }
  }

  async function handleRetryOutput() {
    if (!retryModalOutput) {
      return
    }

    const outputId = getOutputId(retryModalOutput)
    const scheduledAtIso = normalizeDatetimeLocal(retryScheduledAt)

    if (!outputId || !scheduledAtIso) {
      setStatusTone('error')
      setStatusMessage('Pilih jadwal retry yang valid dulu.')
      return
    }

    setRetryingOutputId(outputId)
    setStatusTone('idle')
    setStatusMessage('Menjadwalkan retry post...')

    try {
      await retryContentOutputPost({
        contentOutputId: outputId,
        scheduledAt: scheduledAtIso,
      })

      setRetryModalOutputId('')
      setRetryScheduledAt('')
      toastSuccess('Retry scheduled', 'Retry post berhasil dijadwalkan.')
      setStatusTone('success')
      setStatusMessage('Retry post berhasil dijadwalkan.')
      setOutputsRefreshKey((current) => current + 1)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menjadwalkan retry post.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Retry failed', errorMessage)
    } finally {
      setRetryingOutputId('')
    }
  }

  function renderViewTabs(showRefresh = false) {
    return (
      <div className="content-engine-view-nav">
        <div className="content-engine-tabs" role="tablist" aria-label="Content engine view">
          <button
            className={`content-engine-tab${viewMode === 'auto' ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={viewMode === 'auto'}
            onClick={() => setViewMode('auto')}
          >
            Create Content
          </button>
          <button
            className={`content-engine-tab${viewMode === 'list' ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            Content Library
          </button>
        </div>

        {showRefresh ? (
          <button
            className="ghost-button content-library-refresh"
            type="button"
            onClick={handleReloadOutputs}
            disabled={isLoadingOutputs}
          >
            <AppIcon name="refresh" />
            <span>{isLoadingOutputs ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        ) : null}
      </div>
    )
  }

  function renderCreationModeSelector() {
    return (
      <section className="content-creation-method" aria-labelledby="creation-method-title">
        <div className="content-creation-method-head">
          <div>
            <p className="eyebrow">Creation method</p>
            <h2 id="creation-method-title">Pilih cara membuat konten</h2>
          </div>
        </div>
        <div className="content-creation-options" role="radiogroup" aria-label="Cara membuat konten">
          <button
            className={`content-creation-option${creationMode === 'batch' ? ' active' : ''}`}
            type="button"
            role="radio"
            aria-checked={creationMode === 'batch'}
            onClick={() => setCreationMode('batch')}
          >
            <span className="content-creation-option-mark" aria-hidden="true" />
            <span>
              <strong>Batch by Pillar</strong>
              <small>Satu konten untuk setiap topic yang tersedia.</small>
            </span>
          </button>
          <button
            className={`content-creation-option${creationMode === 'topic-variants' ? ' active' : ''}`}
            type="button"
            role="radio"
            aria-checked={creationMode === 'topic-variants'}
            onClick={() => setCreationMode('topic-variants')}
          >
            <span className="content-creation-option-mark" aria-hidden="true" />
            <span>
              <strong>Variants from Topic</strong>
              <small>Hingga lima angle berbeda dari satu topic.</small>
            </span>
          </button>
        </div>
      </section>
    )
  }

  function renderListOutputsView() {
    return (
      <section className="generate-page">
        <header className="page-header generate-hero">
          <div>
            <p className="eyebrow">Reframe Content Engine</p>
            <h1>Content Library</h1>
            <p className="page-description">
              Lihat, review, dan kelola semua konten yang sudah berhasil dibuat.
            </p>
          </div>
        </header>

        {renderViewTabs(true)}

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
              <h2>Konten hasil generate</h2>
            </div>
            <span className="pill subtle">
              {threadTypeFilter === 'all'
                ? `${contentOutputs.length} item`
                : `${filteredContentOutputs.length} of ${contentOutputs.length}`}
            </span>
          </div>

          <div className="content-library-filter" role="group" aria-label="Filter thread type">
            {(['all', 'short', 'long'] as ThreadTypeFilter[]).map((type) => (
              <button
                className={`content-library-filter-button${threadTypeFilter === type ? ' active' : ''}`}
                type="button"
                key={type}
                onClick={() => setThreadTypeFilter(type)}
                aria-pressed={threadTypeFilter === type}
              >
                {type === 'all' ? 'All types' : type === 'short' ? 'Short Thread' : 'Long Thread'}
              </button>
            ))}
          </div>

          {isLoadingOutputs ? (
            <div className="generate-empty-state">
              <AppIcon name="info" />
              <div>
                <strong>Memuat content outputs...</strong>
                <p>Sedang ambil daftar output yang dibuat user aktif.</p>
              </div>
            </div>
          ) : filteredContentOutputs.length ? (
            <div className="content-output-list">
              <div className="table-wrap content-output-table-wrap">
                <table className="content-output-table">
                  <thead>
                    <tr>
                      <th>Output</th>
                      <th>Platform</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
		                    {paginatedOutputs.map((record, index) => {
	                      const title = getOutputTitle(record)
	                      const platform = getOutputValue(record, ['platform']) || 'Unknown platform'
                      const status = getOutputStatus(record)
                      const threadType = getOutputThreadType(record)
	                      const createdAt = formatDate(
	                        getOutputValue(record, ['createdAt', 'created_at']) ||
	                          getOutputValue(record, ['generatedAt', 'generated_at']) ||
	                          '',
	                      )
		                      const outputId = getOutputId(record)
		                      const isSelected = outputId === selectedOutputId
	                        const canDeleteOutput = canDeleteOutputStatus(status)
                        const canRetryOutput = canRetryOutputStatus(status)

	                      return (
	                        <tr
	                          key={outputId || `${title}-${index}-${currentOutputsPage}`}
	                          className={isSelected ? 'selected-row' : ''}
	                        >
                          <td>
                            <button
                              type="button"
                              className="table-link-button content-output-preview-button"
                              onClick={() => outputId && openOutputEditor(outputId)}
                              disabled={!outputId}
                            >
                              {getOutputPreview(record)}
                            </button>
                          </td>
                          <td>
                            <span className="chip active">{platform}</span>
                          </td>
                          <td>
                            <span className={`thread-type-badge ${threadType}`}>
                              {threadType === 'long' ? 'Long Thread' : 'Short Thread'}
                            </span>
                          </td>
                          <td>
                            <span className={`pill ${status === 'approved' ? '' : 'subtle'}`}>
                              {formatStatusLabel(status)}
                            </span>
                          </td>
                          <td>{createdAt}</td>
	                          <td>
		                            <div className="table-action-group">
                                {canRetryOutput ? (
                                  <button
                                    type="button"
                                    className="table-icon-button table-icon-button-retry"
                                    onClick={() => openRetryModal(record)}
                                    aria-label={`Retry output ${title}`}
                                    title="Retry output"
                                    disabled={!outputId || retryingOutputId === outputId}
                                  >
                                    <AppIcon name="refresh" />
                                  </button>
                                ) : null}
                                {canEditOutputStatus(status) ? (
                                  <button
                                    type="button"
                                    className="table-icon-button table-icon-button-edit"
                                    onClick={() => outputId && openOutputEditor(outputId)}
                                    aria-label={`Edit output ${title}`}
                                    title="Edit output"
                                    disabled={!outputId || isSavingOutput}
                                  >
                                    <AppIcon name="pencil" />
                                  </button>
                                ) : null}
	                              {canDeleteOutput ? (
	                                <button
                                  type="button"
                                  className="table-icon-button table-icon-button-delete"
                                  onClick={() => void handleDeleteOutput(record)}
                                  aria-label={`Delete output ${title}`}
                                  title="Delete output"
                                  disabled={!outputId || isDeletingOutputId === outputId}
                                >
                                  <AppIcon name="trash" />
                                </button>
	                              ) : null}
		                            </div>
		                          </td>
	                        </tr>
	                      )
	                    })}
	                  </tbody>
	                </table>
	              </div>
                {totalOutputPages > 1 ? (
                  <div className="table-pagination">
                    <button
                      className="ghost-button table-pagination-button"
                      type="button"
                      onClick={() => setCurrentOutputsPage((current) => Math.max(1, current - 1))}
                      disabled={currentOutputsPage === 1}
                    >
                      <AppIcon name="chevron-left" />
                      Prev
                    </button>
                    <div className="table-pagination-pages">
                      {Array.from({ length: totalOutputPages }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          className={`table-pagination-page${page === currentOutputsPage ? ' active' : ''}`}
                          type="button"
                          onClick={() => setCurrentOutputsPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      className="ghost-button table-pagination-button"
                      type="button"
                      onClick={() =>
                        setCurrentOutputsPage((current) => Math.min(totalOutputPages, current + 1))
                      }
                      disabled={currentOutputsPage === totalOutputPages}
                    >
                      Next
                      <AppIcon name="chevron-right" />
                    </button>
                  </div>
                ) : null}
	            </div>
	          ) : (
            <div className="generate-empty-state">
              <AppIcon name="check" />
              <div>
                <strong>{contentOutputs.length ? 'Tidak ada thread yang cocok' : 'Belum ada output'}</strong>
                <p>
                  {contentOutputs.length
                    ? 'Coba pilih filter thread type yang lain.'
                    : 'Kalau user belum pernah generate, daftar ini masih kosong.'}
                </p>
              </div>
            </div>
          )}
        </article>

	        {isOutputEditorOpen && selectedContentOutput ? (
          <div className="auth-overlay content-output-modal-overlay" onClick={closeOutputEditor}>
            <div
              className={`content-output-modal${isThreadSplitEditor ? ' long-thread-modal' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="content-output-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <form className="content-output-modal-form" onSubmit={handleSaveOutput}>
                <div className="content-output-modal-head">
                  <div>
                    <p className="eyebrow">Edit Output</p>
                    <h3 id="content-output-modal-title">{selectedOutputTitle}</h3>
                    <div className="content-output-modal-summary">
                      <span>{outputEditForm.platform}</span>
                      <span className={`status-badge ${outputEditForm.status}`}>
                        {formatStatusLabel(outputEditForm.status)}
                      </span>
                    </div>
                  </div>
                  <button className="ghost-button" type="button" onClick={closeOutputEditor}>
                    Close
                  </button>
                </div>

                {isThreadSplitEditor ? (
                  <section className="thread-split-editor" aria-labelledby="thread-editor-title">
                    <div className="thread-split-editor-head">
                      <div>
                        <span className="content-output-modal-label">Long Thread</span>
                        <h4 id="thread-editor-title">Thread Editor</h4>
                      </div>
                      <div className="thread-parts-progress">
                        <span>{threadParts.length} / {MAX_THREAD_PARTS} parts</span>
                        <span className="thread-parts-progress-track" aria-hidden="true">
                          <span style={{ width: `${(threadParts.length / MAX_THREAD_PARTS) * 100}%` }} />
                        </span>
                      </div>
                    </div>

                    <div className="thread-split-list">
                      {threadParts.map((part, index) => (
                        <article className="thread-split-card" key={index}>
                          <div className="thread-split-card-head">
                            <div className="thread-split-title">
                              <span>{String(index + 1).padStart(2, '0')}</span>
                              <strong>Thread {index + 1}</strong>
                            </div>
                            <span className={part.length >= MAX_THREAD_CHARACTERS ? 'limit-reached' : ''}>
                              {part.length} / {MAX_THREAD_CHARACTERS}
                            </span>
                          </div>
                          <textarea
                            value={part}
                            onChange={(event) => handleThreadPartChange(index, event.target.value)}
                            maxLength={MAX_THREAD_CHARACTERS}
                            rows={3}
                            placeholder={`Tulis bagian thread ${index + 1}...`}
                            disabled={!canChangeSelectedOutputStatus}
                          />
                          {canChangeSelectedOutputStatus ? (
                            <div className="thread-split-card-actions">
                              <button
                                type="button"
                                onClick={() => moveThreadPart(index, -1)}
                                disabled={index === 0}
                                aria-label={`Move thread ${index + 1} up`}
                                title="Move up"
                              >
                                <AppIcon name="chevron-left" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveThreadPart(index, 1)}
                                disabled={index === threadParts.length - 1}
                                aria-label={`Move thread ${index + 1} down`}
                                title="Move down"
                              >
                                <AppIcon name="chevron-right" />
                              </button>
                              <button className="danger" type="button" onClick={() => removeThreadPart(index)} disabled={threadParts.length === 1}>
                                <AppIcon name="trash" /> Remove
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>

                    {canChangeSelectedOutputStatus ? (
                      <button
                        className="ghost-button thread-add-button"
                        type="button"
                        onClick={addThreadPart}
                        disabled={threadParts.length >= MAX_THREAD_PARTS}
                      >
                        <AppIcon name="plus" />
                        {threadParts.length >= MAX_THREAD_PARTS ? 'Maximum 8 threads' : 'Add thread'}
                      </button>
                    ) : null}
                  </section>
                ) : (
                  <label className="content-output-modal-body">
                    <span className="content-output-modal-label">Content Output</span>
                    <textarea
                      value={outputEditForm.content}
                      onChange={(event) => handleOutputFieldChange('content', event.target.value)}
                      rows={8}
                      placeholder="Edit isi output di sini..."
                      disabled={!canChangeSelectedOutputStatus}
                    />
                  </label>
                )}

                <div className="content-output-modal-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={closeOutputEditor}
                      disabled={isSavingOutput}
                    >
                      {canChangeSelectedOutputStatus ? 'Cancel' : 'Close'}
                    </button>
                    {canChangeSelectedOutputStatus ? (
                      <>
                        <button className="ghost-button" type="submit" disabled={isSavingOutput}>
                          {isSavingOutput ? 'Saving...' : 'Save changes'}
                        </button>
                        {outputEditForm.status === 'approved' ? (
                          <button
                            className="approval-secondary-button"
                            type="button"
                            onClick={() => void saveOutput('draft')}
                            disabled={isSavingOutput}
                          >
                            Back to draft
                          </button>
                        ) : (
                          <button
                            className="primary-button approval-button"
                            type="button"
                            onClick={() => void saveOutput('approved')}
                            disabled={isSavingOutput}
                          >
                            Approve thread
                          </button>
                        )}
                      </>
                    ) : null}
	                </div>
              </form>
            </div>
          </div>
	        ) : null}

          {retryModalOutput ? (
            <div className="auth-overlay content-output-modal-overlay" onClick={closeRetryModal}>
              <div
                className="content-output-modal retry-output-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="retry-output-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="content-output-modal-head">
                  <div>
                    <p className="eyebrow">Retry Post</p>
                    <h3 id="retry-output-modal-title">{getOutputTitle(retryModalOutput)}</h3>
                  </div>
                  <button className="ghost-button" type="button" onClick={closeRetryModal}>
                    Close
                  </button>
                </div>

                <div className="retry-output-modal-body">
                  <label className="persona-field full-width">
                    <span>Scheduled At</span>
                    <input
                      type="datetime-local"
                      value={retryScheduledAt}
                      onChange={(event) => setRetryScheduledAt(event.target.value)}
                    />
                    <small className="field-hint">Pilih waktu retry posting yang baru.</small>
                  </label>
                </div>

                <div className="content-output-modal-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={closeRetryModal}
                    disabled={Boolean(retryingOutputId)}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void handleRetryOutput()}
                    disabled={!retryScheduledAt.trim() || Boolean(retryingOutputId)}
                  >
                    {retryingOutputId ? 'Scheduling...' : 'Schedule retry'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
	      </section>
	    )
  }

  if (viewMode === 'list') {
    return renderListOutputsView()
  }

  if (creationMode === 'topic-variants') {
    return (
      <section className="generate-page">
        <header className="page-header generate-hero">
          <div>
            <p className="eyebrow">Reframe Content Engine</p>
            <h1>Generate Content</h1>
            <p className="page-description">
              Buat beberapa angle konten dari satu topic yang sudah tersedia.
            </p>
          </div>
        </header>
        {renderViewTabs()}
        {renderCreationModeSelector()}
        <ManualPostPage
          userId={userId}
          embedded
          onViewLibrary={() => setViewMode('list')}
        />
      </section>
    )
  }

  return (
    <section className="generate-page">
      <header className="page-header generate-hero">
        <div>
          <p className="eyebrow">Reframe Content Engine</p>
          <h1>Generate Content</h1>
          <p className="page-description">
            Pilih content pillar dan jumlah topic yang ingin diubah menjadi konten.
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

      {renderViewTabs()}
      {renderCreationModeSelector()}

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
              <div className="pillars-panel-meta">
                <span className="pill subtle">{contentPillars.length} pillar</span>
                {contentPillars.length > 2 ? (
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
                  <strong>Memuat content pillar...</strong>
                  <p>Sedang ambil daftar pillar yang bisa dipakai untuk auto-generate.</p>
                </div>
              </div>
            ) : contentPillars.length ? (
              <div className="pillars-carousel">
                <div className="pillars-rail" ref={pillarsRailRef}>
                  {contentPillars.map((pillar) => (
                    <button
                      key={pillar.id || getPillarTitle(pillar)}
                      type="button"
                      className={`generate-card pillar-card${pillar.id === selectedContentPillarId ? ' selected' : ''}`}
                      onClick={() => pillar.id && setSelectedContentPillarId(pillar.id)}
                    >
                      <div className="generate-card-topline">
                        <span className="generate-card-chip accent">Pillar</span>
                      </div>
                      <strong>{getPillarTitle(pillar)}</strong>
                      <p>{shortenText(getPillarDescription(pillar), 140)}</p>
                    </button>
                  ))}
                </div>
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
                <p className="eyebrow">Available Topics</p>
                <h2>Topic untuk pillar ini</h2>
              </div>
              <span className="pill subtle">
                {selectedContentPillarId ? `${selectedPillarTopics.length} topic` : 'Pilih pillar'}
              </span>
            </div>

            {!selectedContentPillarId ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Pilih pillar dulu</strong>
                  <p>Daftar topic available akan muncul setelah pillar dipilih.</p>
                </div>
              </div>
            ) : isLoadingTopics ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Memuat topic...</strong>
                </div>
              </div>
            ) : selectedPillarTopics.length ? (
              <div className="auto-post-output-list">
                {selectedPillarTopics.slice(0, 8).map((topic, index) => (
                  <div key={topic.id || `${getTopicLabel(topic)}-${index}`} className="auto-post-output-item">
                    <div className="auto-post-output-meta">
                      <span className="pill subtle">#{index + 1}</span>
                      {topic.category ? <span className="pill">{topic.category}</span> : null}
                    </div>
                    <p className="auto-post-output-text">{shortenText(getTopicLabel(topic), 90)}</p>
                  </div>
                ))}
                {selectedPillarTopics.length > 8 ? (
                  <p className="field-hint" style={{ textAlign: 'center', marginTop: '8px' }}>
                    +{selectedPillarTopics.length - 8} topic lain tersedia.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Belum ada topic untuk pillar ini</strong>
                  <p>Pastikan endpoint content topics sudah punya data untuk pillar yang dipilih.</p>
                </div>
              </div>
            )}
          </article>
        </div>

        <aside className="generate-side-column">
          <form className="panel generate-panel generate-form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Batch Generate</p>
                <h2>Buat konten sekarang</h2>
              </div>
              <span className={`pill${canSubmit ? ' subtle' : ''}`}>
                {canSubmit ? 'Ready' : 'Needs setup'}
              </span>
            </div>

            <label className="persona-field full-width">
              <span>Content Pillar</span>
              <input
                type="text"
                value={selectedContentPillar ? getPillarTitle(selectedContentPillar) : 'Belum dipilih'}
                readOnly
              />
            </label>

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

            <div className="persona-actions persona-actions-preview generate-actions">
              <button className="primary-button" type="submit" disabled={!canSubmit}>
                {isSubmitting ? 'Memproses...' : `Generate ${targetCount} Content`}
              </button>
            </div>

          </form>
        </aside>
      </section>
    </section>
  )
}
