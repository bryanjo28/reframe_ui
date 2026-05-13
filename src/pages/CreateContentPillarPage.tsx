import { useEffect, useState, type FormEvent } from 'react'
import {
  createContentPillar,
  deleteContentPillar,
  getContentPillarById,
  listContentPillars,
  updateContentPillar,
  type ContentPillarPayload,
  type ContentPillarRecord,
} from '../services/contentPillars'
import { listPersonaConfigs, type PersonaConfigRecord } from '../services/personaConfigs'
import { useToast } from '../components/useToast'

type PillarFieldKey = keyof ContentPillarPayload

type PillarField = {
  key: PillarFieldKey
  label: string
  placeholder?: string
  multiline?: boolean
  optional?: boolean
}

const pillarFields: PillarField[] = [
  {
    key: 'name',
    label: 'Nama Content Pillar',
    placeholder: 'Contoh: Educational Threads Funnel',
  },
  {
    key: 'templateContent',
    label: 'Template Content',
    placeholder:
      'Hook singkat yang menyorot pain audience, lanjutkan dengan insight praktis 3 poin, lalu tutup dengan CTA yang mengajak reply atau save.',
    multiline: true,
  },
  {
    key: 'targetObjective',
    label: 'Target Objective',
    placeholder: 'Contoh: Bangun trust sambil mengarahkan audience ke conversion CTA',
  },
  {
    key: 'audienceSegment',
    label: 'Audience Segment',
    placeholder: 'Contoh: Creator dan affiliate marketer yang ingin jualan lebih halus',
  },
  {
    key: 'keyMessage',
    label: 'Key Message',
    placeholder: 'Contoh: Konten edukasi tetap bisa mendorong action tanpa terasa hard sell',
    multiline: true,
  },
  {
    key: 'ctaDirection',
    label: 'CTA Direction',
    placeholder: 'Contoh: Ajak reply, follow, atau klik link jika butuh resource lanjutan',
  },
  {
    key: 'affiliateLink',
    label: 'Affiliate Link',
    placeholder: 'Contoh: https://brandgrowth.id/go/starter-kit',
    optional: true,
  },
]

const emptyPillarForm: ContentPillarPayload = {
  personaConfigId: '',
  name: '',
  templateContent: '',
  targetObjective: '',
  audienceSegment: '',
  keyMessage: '',
  ctaDirection: '',
  affiliateLink: '',
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

function createFormValuesFromRecord(record: ContentPillarRecord | null): ContentPillarPayload {
  return {
    personaConfigId: getRecordValue(record, ['personaConfigId', 'persona_config_id']),
    name: getRecordValue(record, ['name', 'title', 'pillarName', 'pillar_name']),
    templateContent: getRecordValue(record, ['templateContent', 'template_content']),
    targetObjective: getRecordValue(record, ['targetObjective', 'target_objective']),
    audienceSegment: getRecordValue(record, ['audienceSegment', 'audience_segment']),
    keyMessage: getRecordValue(record, ['keyMessage', 'key_message']),
    ctaDirection: getRecordValue(record, ['ctaDirection', 'cta_direction']),
    affiliateLink: getRecordValue(record, ['affiliateLink', 'affiliate_link']),
    aiEnhancedVersion: getRecordValue(record, ['aiEnhancedVersion', 'ai_enhanced_version']),
    userReviewEdit: getRecordValue(record, ['userReviewEdit', 'user_review_edit']),
  }
}

function formatUpdatedAt(record: ContentPillarRecord | null) {
  return (
    getRecordValue(record, ['updatedAt', 'updated_at', 'createdAt', 'created_at']) ||
    'Belum disimpan ke database'
  )
}

function getRecordTimestamp(record: ContentPillarRecord | null) {
  const rawTimestamp = getRecordValue(record, ['updatedAt', 'updated_at', 'createdAt', 'created_at'])
  const parsedTimestamp = rawTimestamp ? Date.parse(rawTimestamp) : Number.NaN

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0
}

function sortContentPillarsDescending(pillars: ContentPillarRecord[]) {
  return [...pillars].sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))
}

// function buildPillarTags(values: ContentPillarPayload) {
//   return [values.targetObjective, values.audienceSegment, values.ctaDirection]
//     .filter((value): value is string => Boolean(value))
//     .filter((value, index, list) => list.indexOf(value) === index)
// }

function getPersonaLabel(persona: PersonaConfigRecord) {
  return (
    getRecordValue(persona, ['persona', 'personaName', 'persona_name']) ||
    getRecordValue(persona, ['targetAudience', 'target_audience']) ||
    getRecordValue(persona, ['fullName', 'full_name']) ||
    `Persona ${getRecordValue(persona, ['id']) || 'Unknown'}`
  )
}

function PillarFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
}: {
  field: PillarField
  value: string
  onChange: (key: PillarFieldKey, value: string) => void
  disabled?: boolean
}) {
  return (
    <label className={`persona-field${field.multiline ? ' full-width' : ''}`}>
      <span>
        {field.label}
        {field.optional ? ' (Optional)' : ''}
      </span>
      {field.multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          rows={field.label === 'Template Content' ? 6 : 4}
          disabled={disabled}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )}
    </label>
  )
}

function PillarVersionCard({
  pillar,
  isSelected,
  onClick,
}: {
  pillar: ContentPillarRecord
  isSelected: boolean
  onClick: (id: string) => void
}) {
  return (
    <button
      className={`persona-preview-block pillar-version-card${isSelected ? ' selected' : ''}`}
      type="button"
      onClick={() => pillar.id && onClick(pillar.id)}
      disabled={!pillar.id}
      data-pillar-id={pillar.id || ''}
    >
      <span>{pillar.name || 'Untitled pillar'}</span>
      <strong>{formatUpdatedAt(pillar)}</strong>
      <p>{pillar.name || 'Klik untuk memuat versi ini ke form edit.'}</p>
    </button>
  )
}

export function CreateContentPillarPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [formValues, setFormValues] = useState<ContentPillarPayload>(emptyPillarForm)
  const [personaConfigs, setPersonaConfigs] = useState<PersonaConfigRecord[]>([])
  const [savedPillars, setSavedPillars] = useState<ContentPillarRecord[]>([])
  const [selectedPillar, setSelectedPillar] = useState<ContentPillarRecord | null>(null)
  const [selectedPersonaConfigId, setSelectedPersonaConfigId] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    let isMounted = true

    async function loadWorkspaceData() {
      setIsLoadingPersonas(true)
      setIsLoadingList(true)
      setStatusMessage('')
      setStatusTone('idle')

      try {
        const personas = await listPersonaConfigs()
        const pillars = await listContentPillars()

        if (!isMounted) {
          return
        }

        setPersonaConfigs(personas)
        setSavedPillars(sortContentPillarsDescending(pillars))

        const defaultPersonaId =
          personas.length === 1 ? getRecordValue(personas[0], ['id']) : ''

        if (defaultPersonaId) {
          setSelectedPersonaConfigId(defaultPersonaId)
        }

        if (pillars.length === 1 && pillars[0].id) {
          const record = await getContentPillarById(pillars[0].id)

          if (!isMounted) {
            return
          }

          setSelectedPillar(record)
          setFormValues(createFormValuesFromRecord(record))
          if (record.personaConfigId) {
            setSelectedPersonaConfigId(record.personaConfigId)
          }
        } else {
          setSelectedPillar(null)
          setFormValues({
            ...emptyPillarForm,
            personaConfigId: defaultPersonaId,
          })
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

      setStatusTone('error')
      setStatusMessage(error instanceof Error ? error.message : 'Gagal memuat workspace content pillar.')
      setPersonaConfigs([])
      setSavedPillars([])
      setSelectedPillar(null)
      setFormValues(emptyPillarForm)
      } finally {
        if (isMounted) {
          setIsLoadingPersonas(false)
          setIsLoadingList(false)
        }
      }
    }

    void loadWorkspaceData()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSelectPillar(id: string) {
    setIsLoadingDetail(true)
    setStatusMessage('')
    setStatusTone('idle')

    try {
      const record = await getContentPillarById(id)
      setSelectedPillar(record)
      setFormValues(createFormValuesFromRecord(record))
      setSelectedPersonaConfigId(record.personaConfigId || '')
    } catch (error) {
      setStatusTone('error')
      setStatusMessage(error instanceof Error ? error.message : 'Gagal memuat content pillar.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function handleCreateNew() {
    setSelectedPillar(null)
    setFormValues((current) => ({
      ...emptyPillarForm,
      personaConfigId: current.personaConfigId || selectedPersonaConfigId,
    }))
    setStatusMessage('Mode create aktif. Form sudah dikosongkan.')
    setStatusTone('idle')
  }

  function handlePersonaChange(personaConfigId: string) {
    setSelectedPersonaConfigId(personaConfigId)
    setSelectedPillar((current) => (current?.personaConfigId === personaConfigId ? current : null))
    setFormValues((current) => ({
      ...current,
      personaConfigId,
    }))
  }

  function handleChangeField(key: PillarFieldKey, value: string) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedPersonaConfigId) {
      setStatusTone('error')
      setStatusMessage('Pilih persona dulu sebelum menyimpan content pillar.')
      return
    }

    setIsSaving(true)
    setStatusMessage('')

    try {
      const nextRecord = selectedPillar?.id
        ? await updateContentPillar(selectedPillar.id, {
            ...formValues,
          })
        : await createContentPillar({
            ...formValues,
          })

      setSelectedPillar(nextRecord)
      setFormValues(createFormValuesFromRecord(nextRecord))
      setSelectedPersonaConfigId(nextRecord.personaConfigId || formValues.personaConfigId)
      setSavedPillars((current) => {
        const withoutCurrent = current.filter((pillar) => pillar.id !== nextRecord.id)
        return sortContentPillarsDescending([nextRecord, ...withoutCurrent])
      })
      setStatusTone('success')
      const successMessage = selectedPillar?.id
        ? 'Content pillar berhasil diperbarui.'
        : 'Content pillar berhasil dibuat.'

      setStatusMessage(successMessage)
      toastSuccess(
        selectedPillar?.id
          ? 'Content pillar updated'
          : 'Content pillar created',
        successMessage,
      )
    } catch (error) {
      setStatusTone('error')
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal menyimpan content pillar.'
      setStatusMessage(errorMessage)
      toastError('Content pillar save failed', errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSelected() {
    if (!selectedPillar?.id) {
      setStatusTone('error')
      setStatusMessage('Pilih content pillar yang mau dihapus dulu.')
      return
    }

    const shouldDelete = window.confirm(
      `Hapus content pillar "${selectedPillar.name || 'selected pillar'}"?`,
    )

    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)
    setStatusMessage('')

    try {
      await deleteContentPillar(selectedPillar.id)
      setSavedPillars((current) => current.filter((pillar) => pillar.id !== selectedPillar.id))
      setSelectedPillar(null)
      setFormValues((current) => ({
        ...emptyPillarForm,
        personaConfigId: current.personaConfigId || selectedPersonaConfigId,
      }))
      setStatusTone('success')
      const successMessage = 'Content pillar berhasil dihapus.'
      setStatusMessage(successMessage)
      toastSuccess('Content pillar deleted', successMessage)
    } catch (error) {
      setStatusTone('error')
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal menghapus content pillar.'
      setStatusMessage(errorMessage)
      toastError('Content pillar delete failed', errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  // const tags = buildPillarTags(formValues)
  const hasExistingRecord = Boolean(selectedPillar?.id)
  const isBusy = isLoadingList || isLoadingDetail || isLoadingPersonas
  const isFormLocked = isBusy || isSaving || isDeleting
  const selectedPersona = personaConfigs.find((persona) => getRecordValue(persona, ['id']) === selectedPersonaConfigId)
  const visiblePillars = sortContentPillarsDescending(
    selectedPersonaConfigId
      ? savedPillars.filter((pillar) => pillar.personaConfigId === selectedPersonaConfigId)
      : savedPillars,
  )

  return (
    <section className="persona-page">
      <header className="page-header">
        <p className="eyebrow">Workspace</p>
        <h1>Reframe Content Pillar Studio</h1>
        <p className="page-description">
          Klik versi lama di samping kalau mau edit data sebelumnya. Kalau belum ada
          record, form akan tetap kosong dan siap dipakai untuk create baru.
        </p>
      </header>

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className="persona-layout">
        <article className="panel persona-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Reframe Pillar Builder</p>
              <h2>{hasExistingRecord ? 'Update content pillar' : 'Buat content pillar'}</h2>
            </div>
            <span className={`pill${hasExistingRecord ? ' subtle' : ''}`}>
              {hasExistingRecord ? 'Synced record' : 'First setup'}
            </span>
          </div>

          <label className="persona-field full-width">
            <span>Pilih Persona</span>
            <div className="select-wrap">
              <select
                value={selectedPersonaConfigId}
                onChange={(event) => handlePersonaChange(event.target.value)}
                disabled={isFormLocked}
              >
                <option value="">Pilih persona dulu</option>
                {personaConfigs.map((persona) => {
                  const id = getRecordValue(persona, ['id'])
                  return (
                    <option key={id} value={id}>
                      {getPersonaLabel(persona)}
                    </option>
                  )
                })}
              </select>
            </div>
          </label>

          <form id="content-pillar-form" className="persona-form" onSubmit={handleSubmit}>
            {pillarFields.map((field) => (
              <PillarFieldRenderer
                key={field.key}
                field={field}
                value={formValues[field.key] ?? ''}
                onChange={handleChangeField}
                disabled={isFormLocked}
              />
            ))}
          </form>

          <div className="persona-actions persona-actions-preview">
            <button
              className="ghost-button"
              type="button"
              onClick={handleCreateNew}
              disabled={isSaving || isDeleting}
            >
              New Pillar
            </button>
            <button
              className="primary-button"
              type="submit"
              form="content-pillar-form"
              disabled={isSaving || isDeleting || isBusy || !selectedPersonaConfigId}
            >
              {isSaving ? 'Menyimpan...' : hasExistingRecord ? 'Update Pillar' : 'Create Pillar'}
            </button>
          </div>

          <div className="persona-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={handleDeleteSelected}
              disabled={!hasExistingRecord || isSaving || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Pillar'}
            </button>
          </div>
        </article>

        <aside className="persona-side-column">
          <article className="panel persona-db-card">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Saved Versions</p>
                <h2>{selectedPersona ? getPersonaLabel(selectedPersona) : 'Pilih persona untuk lihat pillar'}</h2>
              </div>
              <span className={`status-badge ${hasExistingRecord ? 'ready' : 'draft'}`}>
                {hasExistingRecord ? 'Synced' : 'Empty'}
              </span>
            </div>

            <div className="pillar-rail-toolbar">
              <p className="persona-db-time">
                {visiblePillars.length
                  ? `${visiblePillars.length} version tersimpan`
                  : 'Belum ada version tersimpan'}
              </p>
            </div>

            {!selectedPersonaConfigId ? (
              <div className="persona-preview-block">
                <p>Pilih persona dulu supaya form tahu pillar ini mau disimpan ke config yang mana.</p>
              </div>
            ) : visiblePillars.length ? (
              <div className="pillar-version-list">
                {visiblePillars.map((pillar) => (
                  <PillarVersionCard
                    key={pillar.id || pillar.name}
                    pillar={pillar}
                    isSelected={pillar.id === selectedPillar?.id}
                    onClick={handleSelectPillar}
                  />
                ))}
              </div>
            ) : (
              <div className="persona-preview-block">
                <p>
                  {isLoadingList
                    ? 'Memuat daftar content pillar...'
                    : 'Belum ada content pillar untuk persona ini. Klik New Pillar untuk mulai dari kosong.'}
                </p>
              </div>
            )}

            <div className="persona-preview-block">
              <span>Attached Persona</span>
              <p>{selectedPersona ? getPersonaLabel(selectedPersona) : 'Belum dipilih'}</p>
            </div>

            <div className="persona-tag-list">
              {/* {tags.length ? (
                tags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="chip">Klik versi lama atau isi field utama untuk melihat tags</span>
              )} */}
            </div>
          </article>

          {/* <article className="panel persona-guidance-card">
            <p className="eyebrow">Flow</p>
            <h2>Alur CRUD yang dipakai</h2>
            <ul className="persona-tip-list">
              <li>GET list dipakai untuk menampilkan semua versi content pillar.</li>
              <li>Klik salah satu versi untuk memanggil GET by id dan mengisi form otomatis.</li>
              <li>POST dipakai saat bikin record baru, PATCH dipakai saat edit record yang dipilih.</li>
              <li>DELETE menghapus versi aktif dari daftar lalu form kembali kosong.</li>
            </ul>
          </article> */}
        </aside>
      </section>
    </section>
  )
}
