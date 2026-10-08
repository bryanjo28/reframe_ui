import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppIcon } from '../components/AppIcon'
import { useToast } from '../components/useToast'
import { getUserFacingError } from '../utils/apiError'
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
  generationCompletion?: {
    jobId: string
    status: string
    errorMessage?: string
  } | null
  onGenerationCompletionHandled?: () => void
  onOpenSchedule?: () => void
  onViewContentBank?: () => void
  tourStep?: number | null
  onAutoModeSelected?: () => void
}

type AutoScheduleMode = 'now' | 'later'
type ContentEngineView = 'chooser' | 'auto' | 'list'
type ContentCreationMode = 'pillar' | 'topic-variants'
type OutputEditForm = {
  platform: string
  status: string
  content: string
}

const outputStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Siap' },
  // { value: 'failed', label: 'Failed' },
  // { value: 'posted', label: 'Posted' },
]

const outputsPerPage = 5
const threadSplitMarker = '---THREAD_SPLIT---'

function splitThreadContent(content: string) {
  const parts = content
    .split(/\s*---THREAD_SPLIT---\s*/g)
    .map((part) => part.trim())

  return parts.length ? parts : ['']
}

function joinThreadContent(parts: string[]) {
  return parts.map((part) => part.trim()).join(`\n\n${threadSplitMarker}\n\n`)
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

  if (normalized === 'approved') return 'Siap'
  if (normalized === 'posted' || normalized === 'published') return 'Terbit'
  if (normalized === 'scheduled') return 'Terjadwal'
  if (normalized === 'failed') return 'Gagal'

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
    (typeof record.subcategory === 'string' && record.subcategory.trim()) ||
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
  generationCompletion,
  onGenerationCompletionHandled,
  onOpenSchedule,
  onViewContentBank,
  tourStep,
  onAutoModeSelected,
}: ContentEnginePageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const pillarsRailRef = useRef<HTMLDivElement | null>(null)
  const [contentPillars, setContentPillars] = useState<ContentPillarRecord[]>([])
  const [selectedContentPillarId, setSelectedContentPillarId] = useState('')
  const [targetCount, setTargetCount] = useState(10)
  const [scheduleMode] = useState<AutoScheduleMode>('now')
  const [viewMode, setViewMode] = useState<ContentEngineView>('auto')
  const [creationMode] = useState<ContentCreationMode>('topic-variants')
  const [scheduledAt] = useState('')
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
  const [retryingOutputId, setRetryingOutputId] = useState('')
  const [retryModalOutputId, setRetryModalOutputId] = useState('')
  const [retryScheduledAt, setRetryScheduledAt] = useState('')
  const [outputEditForm, setOutputEditForm] = useState<OutputEditForm>(getOutputEditForm(null))
  const [outputThreadParts, setOutputThreadParts] = useState<string[]>([''])

  useEffect(() => {
    if (!generationCompletion) return

    if (generationCompletion.status !== 'completed') {
      const backendMessage = generationCompletion.errorMessage
      const message = backendMessage === 'Daily generation limit exceeded'
        ? 'Batas generate konten harian Anda sudah habis.'
        : backendMessage || (generationCompletion.status === 'completed_with_errors'
          ? 'Sebagian atau seluruh konten gagal dibuat.'
          : 'Generate konten gagal. Silakan coba kembali.')
      setStatusTone('error')
      setStatusMessage(message)
      toastError('Konten belum berhasil dibuat', message)
      onGenerationCompletionHandled?.()
      return
    }

    setStatusTone('success')
    setStatusMessage('Konten berhasil dibuat. Silakan review hasilnya.')
    toastSuccess('Konten berhasil dibuat', 'Hasilnya sudah siap untuk direview.')
    onGenerationCompletionHandled?.()
  }, [generationCompletion, onGenerationCompletionHandled, toastError, toastSuccess])

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

  useEffect(() => {
    if (selectedPillarTopics.length > 0) {
      setTargetCount((current) => Math.min(Math.max(current, 1), Math.min(10, selectedPillarTopics.length)))
    }
  }, [selectedPillarTopics.length])

  const selectedContentOutput = useMemo(
    () => contentOutputs.find((output) => output.id === selectedOutputId) || null,
    [contentOutputs, selectedOutputId],
  )
  const retryModalOutput = useMemo(
    () => contentOutputs.find((output) => output.id === retryModalOutputId) || null,
    [contentOutputs, retryModalOutputId],
  )
  const selectedOutputStatus = getOutputStatus(selectedContentOutput)
  const canChangeSelectedOutputStatus = canEditOutputStatus(selectedOutputStatus)
  const totalOutputPages = Math.max(1, Math.ceil(contentOutputs.length / outputsPerPage))
  const paginatedOutputs = useMemo(() => {
    const startIndex = (currentOutputsPage - 1) * outputsPerPage
    return contentOutputs.slice(startIndex, startIndex + outputsPerPage)
  }, [contentOutputs, currentOutputsPage])

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
    setOutputThreadParts(splitThreadContent(nextForm.content))
  }, [isOutputEditorOpen, selectedContentOutput])

  useEffect(() => {
    setCurrentOutputsPage((current) => Math.min(current, totalOutputPages))
  }, [totalOutputPages])

  const canSubmit =
    Boolean(selectedContentPillarId) &&
    selectedPillarTopics.length > 0 &&
    selectedPillarTopics.length >= targetCount &&
    targetCount >= 1 &&
    targetCount <= 10 &&
    (scheduleMode === 'now' || Boolean(scheduledAt.trim())) &&
    !isSubmitting &&
    !isLoadingPillars

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      setStatusTone('error')
      setStatusMessage(
        selectedContentPillarId && selectedPillarTopics.length === 0
          ? 'Belum ada ide yang bisa dibuat menjadi konten untuk topik utama ini.'
          : selectedContentPillarId && selectedPillarTopics.length < targetCount
            ? `Hanya ada ${selectedPillarTopics.length} ide yang tersedia.`
          : 'Lengkapi topik utama, jumlah konten, dan waktu pembuatan.',
      )
      return
    }

    const scheduledAtSource =
      scheduleMode === 'now' ? new Date() : new Date(scheduledAt.trim())

    if (Number.isNaN(scheduledAtSource.getTime())) {
      setStatusTone('error')
      setStatusMessage('Tanggal dan waktu yang dipilih tidak valid.')
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage('Menyiapkan pembuatan konten...')
    void autoGenerateContentOutputs({
      contentPillarId: selectedContentPillarId,
      targetCount,
      scheduledAt: scheduledAtSource.toISOString(),
    })
      .then((response) => {
        const jobId = getScheduledJobId(response)

        if (!jobId) {
          throw new Error('Schedule berhasil dibuat, tetapi job ID tidak ditemukan.')
        }

        onScheduledJobCreated?.(jobId, targetCount)
        if (scheduleMode === 'now') {
          setStatusTone('idle')
          setStatusMessage('Konten sedang dibuat. Pantau progres sampai selesai.')
        } else {
          setStatusTone('success')
          setStatusMessage('Pembuatan konten berhasil dijadwalkan.')
          toastSuccess('Pembuatan dijadwalkan', 'Konten akan dibuat pada waktu yang dipilih.')
        }
      })
      .catch((error) => {
        setStatusTone('error')
        const detail = getUserFacingError(error, 'Coba buat konten lagi.')
        const errorMessage = `Konten belum berhasil dibuat. ${detail}`
        setStatusMessage(errorMessage)
        toastError('Konten belum berhasil dibuat', errorMessage)
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
    setOutputThreadParts((current) =>
      current.map((part, partIndex) => (partIndex === index ? value : part)),
    )
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

  async function handleSaveOutput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const selectedOutputIdValue = normalizeOutputId(selectedOutputId)
    const payload = {
      id: selectedOutputIdValue,
      status: outputEditForm.status.trim(),
      content: joinThreadContent(outputThreadParts),
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

    setIsSavingOutput(true)
    setStatusTone('idle')
    setStatusMessage('Menyimpan perubahan output...')

    try {
      await updateContentOutput(selectedOutputIdValue, payload)

      toastSuccess('Output updated', 'Perubahan output sudah tersimpan.')
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

  function renderListOutputsView() {
    return (
      <section className="generate-page">
        <header className="page-header generate-hero">
          <div>
            <h1>Konten Kamu</h1>
            <p className="page-description">
              Review, edit, dan siapkan konten yang sudah pernah kamu buat.
            </p>
          </div>
          {contentOutputs.some((record) => getOutputStatus(record) === 'approved') && onOpenSchedule ? <button className="schedule-primary" type="button" onClick={onOpenSchedule}>Jadwalkan Konten</button> : null}
        </header>
        <div className="create-flow-progress" aria-label="Alur pembuatan konten"><span>Ide</span><span>→</span><span>Buat</span><span>→</span><strong>Review</strong></div>

        <div className="generate-mode-switcher">
          <span className="pill subtle">Konten Saya</span>
          <button
            className="ghost-button generate-mode-button"
            type="button"
            onClick={() => setViewMode('auto')}
          >
            Buat Konten Baru
          </button>
          <button
            className="ghost-button generate-mode-button"
            type="button"
            onClick={handleReloadOutputs}
            disabled={isLoadingOutputs}
          >
            Muat ulang
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
              <h2>Review konten</h2>
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
                      <th>Konten</th>
                      <th>Tujuan</th>
                      <th>Status</th>
                      <th>Dibuat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
		                    {paginatedOutputs.map((record, index) => {
	                      const title = getOutputTitle(record)
	                      const platform = getOutputValue(record, ['platform']) || 'Unknown platform'
                      const status = getOutputStatus(record)
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
                <strong>Belum ada konten</strong>
                <p>Konten yang kamu buat akan muncul di sini untuk direview.</p>
              </div>
            </div>
          )}
        </article>

	        {isOutputEditorOpen && selectedContentOutput ? (
          <div className="auth-overlay content-output-modal-overlay" onClick={closeOutputEditor}>
            <div
              className="content-output-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="content-output-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <form className="content-output-modal-form" onSubmit={handleSaveOutput}>
                <div className="content-output-modal-head">
                  <div>
                    <p className="eyebrow">Review Konten</p>
                    <h3 id="content-output-modal-title">{getOutputTitle(selectedContentOutput)}</h3>
                  </div>
                  <button className="ghost-button" type="button" onClick={closeOutputEditor}>
                    Close
                  </button>
                </div>

                <div className="content-output-modal-meta content-output-modal-meta-edit">
                  <label className="persona-field">
                    <span>Tujuan</span>
                    <input
                      value={outputEditForm.platform}
                      placeholder="threads"
                      disabled
                    />
                  </label>
                  <label className="persona-field">
                    <span>Status</span>
                    <div className="select-wrap">
	                      <select
	                        value={outputEditForm.status}
	                        onChange={(event) => handleOutputFieldChange('status', event.target.value)}
	                        disabled={!canChangeSelectedOutputStatus}
	                      >
                        {outputStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* {!canChangeSelectedOutputStatus ? (
                      <small className="field-hint">
                        Status `posted` dikontrol backend, jadi tidak bisa diubah dari sini.
                      </small>
                    ) : null} */}
                  </label>
                </div>

                <div className="content-output-modal-body">
                  <div className="content-output-thread-heading">
                    <span className="content-output-modal-label">Isi Threads</span>
                    <span>{outputThreadParts.length} bagian</span>
                  </div>
                  <div className="content-output-thread-list">
                    {outputThreadParts.map((part, index) => (
                      <label className="content-output-thread-card" key={index}>
                        <span className="content-output-thread-card-head">
                          <strong>Thread {index + 1}</strong>
                          <small>{part.length} karakter</small>
                        </span>
                        <textarea
                          aria-label={`Thread ${index + 1}`}
                          value={part}
                          onChange={(event) => handleThreadPartChange(index, event.target.value)}
                          rows={5}
                          placeholder={`Tulis isi Thread ${index + 1}...`}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="content-output-modal-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={closeOutputEditor}
                      disabled={isSavingOutput}
                    >
                      {canChangeSelectedOutputStatus ? 'Batal' : 'Tutup'}
                    </button>
                    {canChangeSelectedOutputStatus ? (
                      <button className="primary-button" type="submit" disabled={isSavingOutput}>
                        {isSavingOutput ? 'Menyimpan...' : outputEditForm.status === 'approved' ? 'Simpan dan Tandai Siap' : 'Simpan Perubahan'}
                      </button>
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

  if (viewMode === 'chooser') {
    return (
      <section className="generate-page">
        <header className="page-header generate-hero">
          <div>
            <p className="eyebrow">Create</p>
            <h1>Create your content</h1>
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
            <span className="pill subtle">2 option</span>
          </div>

          <p className="page-description generate-chooser-copy">
            Satu menu untuk pilih cara kerja content engine. Auto langsung jalan dari pillar, dan
            list buat lihat hasil yang sudah jadi.
          </p>

          <div className="generate-simple-chooser-grid">
            <button
              data-tour-step={tourStep === 8 ? 8 : undefined}
              type="button"
              className="generate-simple-choice"
              onClick={() => { setViewMode('auto'); onAutoModeSelected?.() }}
            >
              <strong>Buat Konten Baru</strong>
              <p>Ubah ide tersimpan menjadi konten siap direview.</p>
            </button>

            <button
              type="button"
              className="generate-simple-choice"
              onClick={() => setViewMode('list')}
            >
              <strong>Konten Saya</strong>
              <p>Lihat konten yang sudah pernah kamu buat.</p>
            </button>
          </div>
        </article>
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
            <h1>Buat Konten</h1>
            <p className="page-description">
              Buat beberapa angle konten dari satu topic yang sudah tersedia.
            </p>
          </div>
        </header>
        <div className="create-flow-progress" aria-label="Alur pembuatan konten"><span>Ide</span><span>→</span><strong>Buat</strong><span>→</span><span>Review</span></div>

        <div className="generate-mode-switcher content-creation-switcher">
          <span className="pill subtle">From Topic</span>
          <p className="content-creation-direct-copy">Pilih topic, atur variant, lalu generate langsung.</p>
        </div>

        <ManualPostPage userId={userId} embedded onGenerated={onViewContentBank} />
      </section>
    )
  }

  return (
    <section className="generate-page">
      <header className="page-header generate-hero">
        <div>
          <h1>Buat Konten</h1>
          <p className="page-description">
            Ubah ide yang sudah kamu pilih menjadi konten siap direview.
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
      <div className="create-flow-progress" aria-label="Alur pembuatan konten"><span>Ide</span><span>→</span><strong>Buat</strong><span>→</span><span>Review</span></div>

      <div className="generate-mode-switcher content-creation-switcher" role="group" aria-label="Cara membuat konten">
        <span className="pill subtle">Konten Baru</span>
        {/* Flow By Pillar dan opsi scheduling di-comment out sementara.
        <div className="content-creation-tabs">
          <button
            type="button"
            className="content-creation-tab active"
            aria-pressed={true}
          >
            <AppIcon name="layers" />
            <span><strong>By Pillar</strong><small>Beberapa topic sekaligus</small></span>
          </button>
          <button
            type="button"
            className="content-creation-tab"
            aria-pressed={false}
            onClick={() => setCreationMode('topic-variants')}
          >
            <AppIcon name="edit" />
            <span><strong>From Topic</strong><small>Hingga 5 variant</small></span>
          </button>
        </div>
        */}
        {/* <button
          className="ghost-button generate-mode-button"
          type="button"
          onClick={() => setViewMode('list')}
        >
          Lihat Konten Saya
        </button> */}
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
                <h2>Pilih topik utama</h2>
              </div>
              <div className="pillars-panel-meta">
                <span className="pill subtle">{contentPillars.length} topik</span>
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
                  <strong>Memuat topik utama...</strong>
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
                      <span className="generate-card-chip accent">Topik utama</span>
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
                  <strong>Belum ada topik utama</strong>
                  <p>Lengkapi Content Brain untuk mulai membuat konten.</p>
                </div>
              </div>
            )}
          </article>

          <article className="panel generate-panel">
            <div className="panel-heading compact">
              <div>
                <h2>Ide yang tersedia</h2>
              </div>
              <span className="pill subtle">
                {selectedContentPillarId ? `${selectedPillarTopics.length} ide` : 'Pilih topik utama'}
              </span>
            </div>

            {!selectedContentPillarId ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Pilih topik utama</strong>
                  <p>Ide yang tersedia akan muncul setelah topik utama dipilih.</p>
                </div>
              </div>
            ) : isLoadingTopics ? (
              <div className="generate-empty-state">
                <AppIcon name="info" />
                <div>
                  <strong>Memuat ide...</strong>
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
                  <strong>Belum ada ide untuk topik utama ini</strong>
                  <p>Cari dan simpan ide terlebih dahulu.</p>
                </div>
              </div>
            )}
          </article>
        </div>

        <aside className="generate-side-column">
          <form className="panel generate-panel generate-form-panel" data-tour-step={tourStep === 9 ? 9 : undefined} onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <h2>Pengaturan konten</h2>
              </div>
              <span className={`pill${canSubmit ? ' subtle' : ''}`}>
                {canSubmit ? 'Siap' : 'Lengkapi data'}
              </span>
            </div>

            {/* Opsi Buat sekarang / Buat nanti di-comment out sementara.
            <div className="generate-mode-chooser content-engine-mode-chooser">
              <button
                type="button"
                className={`panel generate-entry-card${scheduleMode === 'now' ? ' selected' : ''}`}
                onClick={() => setScheduleMode('now')}
              >
                <span className="generate-entry-pill">Sekarang</span>
                <strong>Buat sekarang</strong>
              </button>

              <button
                type="button"
                className={`panel generate-entry-card${scheduleMode === 'later' ? ' selected' : ''}`}
                onClick={() => setScheduleMode('later')}
              >
                <span className="generate-entry-pill accent">Nanti</span>
                <strong>Buat nanti</strong>
              </button>
            </div>
            */}

            <label className="persona-field full-width">
                <span>Topik utama</span>
              <input
                type="text"
                value={selectedContentPillar ? getPillarTitle(selectedContentPillar) : 'Belum dipilih'}
                readOnly
              />
            </label>

            <label className="persona-field full-width">
              <span>Jumlah konten</span>
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
              <small className="field-hint">Maksimum {Math.min(10, selectedPillarTopics.length)} ide tersedia.</small>
            </label>

            {/* {scheduleMode === 'later' ? (
              <label className="persona-field full-width">
                <span>Tanggal & waktu</span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
                <small className="field-hint">Pilih kapan proses pembuatan konten dimulai.</small>
              </label>
            ) : null} */}

            <div className="persona-actions persona-actions-preview generate-actions">
              <button className="primary-button" type="submit" disabled={!canSubmit}>
                {isSubmitting ? 'Sedang membuat konten...' : `Buat ${targetCount} Konten`}
              </button>
            </div>

          </form>
        </aside>
      </section>
    </section>
  )
}
