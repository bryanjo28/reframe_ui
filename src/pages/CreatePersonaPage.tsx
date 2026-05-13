import { useEffect, useState, type FormEvent } from 'react'
import type { PersonaConfigPayload, PersonaConfigRecord } from '../services/personaConfigs'
import {
  createPersonaConfig,
  getPersonaConfigById,
  listPersonaConfigs,
  updatePersonaConfig,
} from '../services/personaConfigs'
import { useToast } from '../components/useToast'

type PersonaFieldKey = keyof PersonaConfigPayload

type PersonaField =
  | {
      key: PersonaFieldKey
      label: string
      placeholder?: string
      multiline?: boolean
      type?: 'text'
    }
  | {
      key: PersonaFieldKey
      label: string
      placeholder?: string
      type: 'select'
      options: string[]
    }
  | {
      key: PersonaFieldKey
      label: string
      type: 'radio'
      options: string[]
    }

type CreatePersonaPageProps = {
  personaConfig: PersonaConfigRecord | null
  isInitialSetup?: boolean
  onSaved?: (personaConfig: PersonaConfigRecord) => void
}

const personaFields: PersonaField[] = [
  {
    key: 'persona',
    label: 'Persona',
    placeholder: 'Contoh: Growth mentor yang practical dan persuasive',
  },
  {
    key: 'targetAudience',
    label: 'Target Audience',
    placeholder: 'Contoh: Creator pemula, affiliate marketer, dan small business owner',
    multiline: true,
  },
  {
    key: 'nicheTopicFocus',
    label: 'Niche / Topic Focus',
    placeholder: 'Contoh: Personal branding, content strategy, monetisasi audience',
  },
  {
    key: 'contentStyle',
    label: 'Content Style',
    placeholder: 'Contoh: Singkat, padat, mudah di-scan, dan insight-driven',
    multiline: true,
  },
  {
    key: 'tone',
    label: 'Tone',
    type: 'select',
    options: [
      'Hangat, percaya diri, to the point',
      'Friendly dan ringan',
      'Authority dan edukatif',
      'Bold dan kontrarian',
    ],
  },
  {
    key: 'goal',
    label: 'Goal',
    placeholder: 'Contoh: Bangun trust, tingkatkan engagement, dan dorong klik affiliate link',
    multiline: true,
  },
  {
    key: 'platform',
    label: 'Platform',
    type: 'select',
    options: ['Threads', 'Instagram', 'X / Twitter', 'LinkedIn'],
  },
]

function getRecordValue(record: PersonaConfigRecord | null, keys: string[]) {
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

function createFormValuesFromConfig(record: PersonaConfigRecord | null): PersonaConfigPayload {
  return {
    persona: getRecordValue(record, ['persona', 'persona_name', 'personaName']),
    targetAudience: getRecordValue(record, ['targetAudience', 'target_audience']),
    nicheTopicFocus: getRecordValue(record, ['nicheTopicFocus', 'niche_topic_focus']),
    contentStyle: getRecordValue(record, ['contentStyle', 'content_style']),
    tone: getRecordValue(record, ['tone']),
    goal: getRecordValue(record, ['goal']),
    platform: getRecordValue(record, ['platform']),
  }
}

function formatUpdatedAt(record: PersonaConfigRecord | null) {
  return (
    getRecordValue(record, ['updatedAt', 'updated_at', 'createdAt', 'created_at']) ||
    'Belum disimpan ke database'
  )
}

function getRecordTimestamp(record: PersonaConfigRecord | null) {
  const rawTimestamp = getRecordValue(record, ['updatedAt', 'updated_at', 'createdAt', 'created_at'])
  const parsedTimestamp = rawTimestamp ? Date.parse(rawTimestamp) : Number.NaN

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0
}

function sortPersonaConfigsDescending(configs: PersonaConfigRecord[]) {
  return [...configs].sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))
}

function PersonaVersionCard({
  persona,
  isSelected,
  onClick,
  disabled = false,
}: {
  persona: PersonaConfigRecord
  isSelected: boolean
  onClick: (id: string) => void
  disabled?: boolean
}) {
  return (
    <button
      className={`persona-preview-block persona-version-card${isSelected ? ' selected' : ''}`}
      type="button"
      onClick={() => persona.id && onClick(persona.id)}
      disabled={!persona.id || disabled}
      data-persona-id={persona.id || ''}
    >
      <span>{getRecordValue(persona, ['persona']) || 'Untitled persona'}</span>
      <strong>{formatUpdatedAt(persona)}</strong>
      <p>{getRecordValue(persona, ['goal']) || 'Klik untuk memuat versi ini ke form edit.'}</p>
    </button>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: PersonaField
  value: string
  onChange: (key: PersonaFieldKey, value: string) => void
}) {
  const fullWidth =
    field.type === 'radio' || ('multiline' in field && field.multiline) ? ' full-width' : ''

  if (field.type === 'select') {
    return (
      <label className={`persona-field${fullWidth}`}>
        <span>{field.label}</span>
        <div className="select-wrap">
          <select value={value} onChange={(event) => onChange(field.key, event.target.value)}>
            <option value="">Pilih {field.label.toLowerCase()}</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </label>
    )
  }

  if (field.type === 'radio') {
    const radioName = field.key

    return (
      <fieldset className={`persona-field persona-choice-group${fullWidth}`}>
        <legend>{field.label}</legend>
        <div className="choice-grid">
          {field.options.map((option) => (
            <label className="choice-card" key={option}>
              <input
                type="radio"
                name={radioName}
                value={option}
                checked={value === option}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <label className={`persona-field${fullWidth}`}>
      <span>{field.label}</span>
      {'multiline' in field && field.multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          rows={4}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
        />
      )}
    </label>
  )
}

export function CreatePersonaPage({
  personaConfig,
  isInitialSetup = false,
  onSaved,
}: CreatePersonaPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [formValues, setFormValues] = useState<PersonaConfigPayload>(() =>
    createFormValuesFromConfig(personaConfig),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [savedRecord, setSavedRecord] = useState<PersonaConfigRecord | null>(personaConfig)
  const [savedPersonas, setSavedPersonas] = useState<PersonaConfigRecord[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadPersonaList() {
      setIsLoadingList(true)

      try {
        const configs = await listPersonaConfigs()

        if (!isMounted) {
          return
        }

        setSavedPersonas(sortPersonaConfigsDescending(configs))
      } catch {
        if (!isMounted) {
          return
        }

        setSavedPersonas([])
      } finally {
        if (isMounted) {
          setIsLoadingList(false)
        }
      }
    }

    void loadPersonaList()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setFormValues(createFormValuesFromConfig(personaConfig))
    setSavedRecord(personaConfig)
    setStatusMessage('')
    setStatusTone('idle')
  }, [personaConfig])

  useEffect(() => {
    if (personaConfig) {
      setSavedRecord(personaConfig)
    }
  }, [personaConfig])

  async function handleSelectPersona(id: string) {
    setIsLoadingDetail(true)
    setStatusMessage('')
    setStatusTone('idle')

    try {
      const record = await getPersonaConfigById(id)
      setSavedRecord(record)
      setFormValues(createFormValuesFromConfig(record))
    } catch (error) {
      setStatusTone('error')
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat persona config.'
      setStatusMessage(errorMessage)
      toastError('Persona load failed', errorMessage)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function handleCreateNew() {
    setSavedRecord(null)
    setFormValues(createFormValuesFromConfig(null))
    setStatusMessage('Mode create aktif. Form sudah dikosongkan.')
    setStatusTone('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage('')

    try {
      const personaId = savedRecord?.id
      const wasExistingRecord = Boolean(personaId)
      const nextRecord = personaId
        ? await updatePersonaConfig(personaId, formValues)
        : await createPersonaConfig(formValues)

      setSavedRecord(nextRecord)
      setSavedPersonas((current) =>
        sortPersonaConfigsDescending([
          nextRecord,
          ...current.filter((item) => item.id !== nextRecord.id),
        ]),
      )
      setStatusTone('success')
      const successMessage = wasExistingRecord
        ? 'Persona config berhasil diperbarui.'
        : 'Persona config berhasil dibuat. Dashboard akan terbuka setelah ini.'

      setStatusMessage(successMessage)
      toastSuccess(
        wasExistingRecord ? 'Persona updated' : 'Persona created',
        successMessage,
      )
      onSaved?.(nextRecord)
    } catch (error) {
      setStatusTone('error')
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal menyimpan persona config.'
      setStatusMessage(errorMessage)
      toastError('Persona save failed', errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  function updateField(key: PersonaFieldKey, value: string) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const hasExistingConfig = Boolean(savedRecord?.id)
  const visiblePersonas = sortPersonaConfigsDescending(savedPersonas)

  return (
    <section className="persona-page">
      <header className="page-header">
        <p className="eyebrow">Workspace</p>
        <h1>{isInitialSetup ? 'Lengkapi Persona Pertama' : 'Reframe Persona Studio'}</h1>
        <p className="page-description">
          {isInitialSetup
            ? 'Persona config belum ditemukan. Lengkapi form ini dulu supaya dashboard dan fitur generasi konten bisa dipakai.'
            : 'Edit persona config yang tersimpan di database. Semua field di bawah langsung dipakai untuk update ke backend.'}
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
              <p className="eyebrow">Reframe Persona Builder</p>
              <h2>{hasExistingConfig ? 'Update persona utama' : 'Buat persona utama'}</h2>
            </div>
            <span className={`pill${hasExistingConfig ? ' subtle' : ''}`}>
              {hasExistingConfig ? 'Synced record' : 'First setup'}
            </span>
          </div>

          <form className="persona-form" onSubmit={handleSubmit}>
            {personaFields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={formValues[field.key]}
                onChange={updateField}
              />
            ))}

            <div className="persona-actions">
              <button className="ghost-button" type="button" onClick={handleCreateNew} disabled={isSaving}>
                New Persona
              </button>
              <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving
                  ? 'Menyimpan...'
                  : hasExistingConfig
                    ? 'Update Persona'
                    : 'Create Persona'}
              </button>
            </div>
          </form>
        </article>

        <aside className="persona-side-column">
          <article className="panel persona-db-card">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Persona Config</p>
                <h2>{hasExistingConfig ? 'Saved Versions' : 'Belum ada record'}</h2>
              </div>
              <span className={`status-badge ${hasExistingConfig ? 'ready' : 'draft'}`}>
                {hasExistingConfig ? 'Synced' : 'Empty'}
              </span>
            </div>

            <div className="pillar-rail-toolbar">
              <p className="persona-db-time">
                {visiblePersonas.length
                  ? `${visiblePersonas.length} version tersimpan`
                  : 'Belum ada version tersimpan'}
              </p>
            </div>

            {isLoadingList ? (
              <div className="persona-preview-block">
                <p>Memuat daftar persona...</p>
              </div>
            ) : visiblePersonas.length ? (
              <div className="pillar-version-list">
                {visiblePersonas.map((persona) => (
                  <PersonaVersionCard
                    key={persona.id || getRecordValue(persona, ['persona'])}
                    persona={persona}
                    isSelected={persona.id === savedRecord?.id}
                    onClick={handleSelectPersona}
                    disabled={isLoadingDetail}
                  />
                ))}
              </div>
            ) : (
              <div className="persona-preview-block">
                <p>Belum ada persona lain untuk dipilih. Klik New Persona untuk mulai dari kosong.</p>
              </div>
            )}

            {isLoadingDetail ? (
              <p className="persona-db-time">Memuat persona yang dipilih...</p>
            ) : null}
          </article>

          <article className="panel persona-guidance-card">
            <p className="eyebrow">Tips</p>
            <h2>Biar hasil config lebih kuat</h2>
            <ul className="persona-tip-list">
              <li>Isi target audience dan niche dengan contoh yang konkret.</li>
              <li>Pilih tone dan platform yang paling sering dipakai di workflow kontenmu.</li>
              <li>Kalau belum yakin, mulai dari versi sederhana dulu lalu refine setelah save.</li>
            </ul>
          </article>
        </aside>
      </section>
    </section>
  )
}
