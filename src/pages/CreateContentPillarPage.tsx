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
import { reportError } from '../utils/apiError'
import { AppIcon } from '../components/AppIcon'

type PillarFieldKey = keyof ContentPillarPayload

type PillarField = {
  key: PillarFieldKey
  label: string
  placeholder?: string
  multiline?: boolean
  optional?: boolean
  options?: Array<{ value: string; label: string }>
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
    key: 'affiliateLink',
    label: 'Affiliate Link',
    placeholder: 'Contoh: https://brandgrowth.id/go/starter-kit',
    optional: true,
  },
]

const emptyPillarForm: ContentPillarPayload = {
  personaConfigId: '',
  name: '',
  threadType: 'short',
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
    threadType:
      getRecordValue(record, ['threadType', 'thread_type']).toLowerCase() === 'long'
        ? 'long'
        : 'short',
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
      {field.options ? (
        <select
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          disabled={disabled}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.multiline ? (
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


export function CreateContentPillarPage({ isInitialSetup = false, onSaved }: { isInitialSetup?: boolean; onSaved?: (pillar: ContentPillarRecord) => void }) {
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
  const [tipsOpen, setTipsOpen] = useState(false)

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
        const sortedPillars = sortContentPillarsDescending(pillars)
        setSavedPillars(sortedPillars)

        const defaultPersonaId =
          getRecordValue(personas[0] || null, ['id'])

        if (defaultPersonaId) {
          setSelectedPersonaConfigId(defaultPersonaId)
        }

        const firstPillar = sortedPillars[0]
        if (firstPillar?.id) {
          const record = await getContentPillarById(firstPillar.id)

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
      setStatusMessage(reportError('Memuat workspace content pillar', error, 'Workspace belum bisa dimuat. Coba lagi.'))
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
      setStatusMessage(reportError('Memuat content pillar', error, 'Content pillar belum bisa dimuat. Coba lagi.'))
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

  async function handlePersonaChange(personaConfigId: string) {
    setSelectedPersonaConfigId(personaConfigId)
    setStatusMessage('')
    setStatusTone('idle')

    const newestPillar = sortContentPillarsDescending(
      savedPillars.filter((pillar) => pillar.personaConfigId === personaConfigId),
    )[0]

    if (!newestPillar?.id) {
      setSelectedPillar(null)
      setFormValues({ ...emptyPillarForm, personaConfigId })
      return
    }

    setIsLoadingDetail(true)
    try {
      const record = await getContentPillarById(newestPillar.id)
      setSelectedPillar(record)
      setFormValues(createFormValuesFromRecord(record))
    } catch (error) {
      setSelectedPillar(null)
      setFormValues({ ...emptyPillarForm, personaConfigId })
      setStatusTone('error')
      setStatusMessage(reportError('Memuat content pillar', error, 'Content pillar belum bisa dimuat. Coba lagi.'))
    } finally {
      setIsLoadingDetail(false)
    }
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
      onSaved?.(nextRecord)
    } catch (error) {
      setStatusTone('error')
      const errorMessage = reportError('Menyimpan content pillar', error, 'Content pillar belum berhasil disimpan. Coba lagi.')
      setStatusMessage(errorMessage)
      toastError('Content Pillar belum berhasil disimpan', errorMessage)
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
        reportError('Menghapus content pillar', error, 'Content pillar belum berhasil dihapus. Coba lagi.')
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
  const visiblePillars = sortContentPillarsDescending(
    selectedPersonaConfigId
      ? savedPillars.filter((pillar) => pillar.personaConfigId === selectedPersonaConfigId)
      : savedPillars,
  )

  return (
    <section className="persona-page persona-config-page">
      {isInitialSetup ? <header className="page-header">
        <p className="eyebrow">{isInitialSetup ? 'Content Brain · 2 of 2' : 'Content Brain'}</p>
        <h1>{isInitialSetup ? 'Kamu mau dikenal bahas apa?' : 'Content Pillars'}</h1>
        <p className="page-description">
          {isInitialSetup ? 'Tentukan topik utama yang akan menjadi arah kontenmu.' : 'Topik utama yang menjadi arah ide dan kontenmu.'}
        </p>
      </header> : null}

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className="persona-layout pillar-simple-layout">
        <article className="panel persona-form-panel" data-tour-step={isInitialSetup ? 3 : undefined}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">alurin Pillar Builder</p>
              <h2>{hasExistingRecord ? 'Update content pillar' : 'Buat content pillar'}</h2>
            </div>
            <button className="builder-tips-button ghost-button" type="button" onClick={() => setTipsOpen(true)} aria-label="Buka tips content pillar">Tips <AppIcon name="info" /></button>
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
            <label className="persona-field full-width"><span>Pilih Content Pillar</span><select value={selectedPillar?.id || ''} disabled={isFormLocked} onChange={(event) => { if (event.target.value) void handleSelectPillar(event.target.value) }}><option value="" disabled>Pillar baru</option>{visiblePillars.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name || 'Content Pillar'}</option>)}</select></label>
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
              {isSaving ? 'Menyimpan...' : isInitialSetup ? 'Simpan & Lanjut' : hasExistingRecord ? 'Update Pillar' : 'Create Pillar'}
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

      </section>
      {tipsOpen ? <div className="content-bank-dialog-backdrop" onClick={() => setTipsOpen(false)}><section className="content-bank-dialog idea-upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="pillar-tips-title" onClick={(event) => event.stopPropagation()}><header><h2 id="pillar-tips-title">Tips content pillar</h2><button type="button" aria-label="Tutup tips" onClick={() => setTipsOpen(false)}><AppIcon name="close" /></button></header><ul className="persona-tip-list"><li>Pilih persona yang sesuai dengan audiens dan gaya kontenmu.</li><li>Gunakan satu tema utama yang jelas untuk setiap pillar.</li><li>Isi tujuan, audiens, dan pesan utama dengan contoh yang konkret.</li><li>Sesuaikan jenis thread dan ajakan bertindak dengan tujuan konten.</li></ul></section></div> : null}
    </section>
  )
}
