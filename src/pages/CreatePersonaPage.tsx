import { useEffect, useState, type FormEvent } from 'react'
import type { PersonaConfigPayload, PersonaConfigRecord } from '../services/personaConfigs'
import {
  createPersonaConfig,
  getPersonaConfigById,
  listPersonaConfigs,
  updatePersonaConfig,
} from '../services/personaConfigs'
import { useToast } from '../components/useToast'
import { reportError } from '../utils/apiError'
import { AppIcon } from '../components/AppIcon'
import { getCurrentSubscription, listSubscriptionPlans } from '../services/subscriptionPlans'
import { UPGRADE_PLAN_REQUIRED_EVENT } from '../utils/apiError'

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
  // {
  //   key: 'platform',
  //   label: 'Platform',
  //   type: 'select',
  //   options: ['Threads'],
  // },
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
    platform: getRecordValue(record, ['platform']) || 'threads',
  }
}

function getRecordTimestamp(record: PersonaConfigRecord | null) {
  const rawTimestamp = getRecordValue(record, ['updatedAt', 'updated_at', 'createdAt', 'created_at'])
  const parsedTimestamp = rawTimestamp ? Date.parse(rawTimestamp) : Number.NaN

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0
}

function sortPersonaConfigsDescending(configs: PersonaConfigRecord[]) {
  return [...configs].sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left))
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
  const [personaLimit, setPersonaLimit] = useState<number | null>(null)
  const [limitLoading, setLimitLoading] = useState(!isInitialSetup)
  const [tipsOpen, setTipsOpen] = useState(false)

  useEffect(() => {
    if (isInitialSetup) return
    let active = true
    void Promise.all([getCurrentSubscription(), listSubscriptionPlans()]).then(([subscription, plans]) => {
      const plan = plans.find((item) => subscription
        ? item.id === subscription.planId || item.key.toLowerCase() === subscription.planKey.toLowerCase()
        : item.key.toLowerCase() === 'free')
      const raw = plan?.raw.maxPersonas ?? plan?.raw.max_personas
      const limit = Number(raw)
      if (active) setPersonaLimit(raw !== undefined && Number.isFinite(limit) ? limit : null)
    }).catch(() => { if (active) setPersonaLimit(null) }).finally(() => { if (active) setLimitLoading(false) })
    return () => { active = false }
  }, [isInitialSetup])

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
      const errorMessage = reportError('Memuat persona config', error, 'Persona belum bisa dimuat. Coba lagi.')
      setStatusMessage(errorMessage)
      toastError('Persona load failed', errorMessage)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function handleCreateNew() {
    const ids = new Set([...savedPersonas.map((item) => item.id), personaConfig?.id].filter(Boolean))
    if (personaLimit !== null && ids.size >= personaLimit) {
      window.dispatchEvent(new CustomEvent(UPGRADE_PLAN_REQUIRED_EVENT, { detail: { message: `Paket kamu mendukung maksimal ${personaLimit} persona. Upgrade paket untuk menambah persona.` } }))
      return
    }
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
      const payload: PersonaConfigPayload = {
        ...formValues,
        platform: 'threads',
      }
      const nextRecord = personaId
        ? await updatePersonaConfig(personaId, payload)
        : await createPersonaConfig(payload)

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
      const errorMessage = reportError('Menyimpan persona', error, 'Persona belum berhasil disimpan. Coba lagi.')
      setStatusMessage(errorMessage)
      toastError('Persona belum berhasil disimpan', errorMessage)
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
  const visiblePersonas = sortPersonaConfigsDescending(personaConfig && !savedPersonas.some((item) => item.id === personaConfig.id) ? [personaConfig, ...savedPersonas] : savedPersonas)

  return (
    <section className={`persona-page persona-config-page${isInitialSetup ? ' persona-page-initial' : ''}`}>
      {isInitialSetup ? <header className="page-header persona-page-header-initial">
        <p className="eyebrow">{isInitialSetup ? 'Content Brain · 1 of 2' : 'Content Brain'}</p>
        <h1>{isInitialSetup ? 'Biar alurin kenal kamu dulu 👋' : 'Persona'}</h1>
        <p className="page-description">
          {isInitialSetup
            ? 'Ceritakan sedikit tentang kamu, audiensmu, dan bagaimana kamu ingin terdengar.'
            : 'Atur cara alurin memahami suara, audiens, dan tujuan kontenmu.'}
        </p>
      </header> : null}

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className={`persona-layout persona-simple-layout${isInitialSetup ? ' persona-layout-initial' : ''}`}>
        <article className="panel persona-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">alurin Persona Builder</p>
              <h2>{hasExistingConfig ? 'Update persona utama' : 'Buat persona utama'}</h2>
            </div>
            <button className="builder-tips-button ghost-button" type="button" onClick={() => setTipsOpen(true)} aria-label="Buka tips persona">Tips <AppIcon name="info" /></button>
          </div>

          <form className="persona-form" data-tour-step={isInitialSetup ? 2 : undefined} onSubmit={handleSubmit}>
            {!isInitialSetup ? <label className="persona-field full-width"><span>Pilih Persona</span><select value={savedRecord?.id || ''} disabled={isLoadingList || isLoadingDetail || isSaving} onChange={(event) => { if (event.target.value) void handleSelectPersona(event.target.value) }}><option value="" disabled>{isLoadingList ? 'Memuat persona...' : 'Persona baru'}</option>{visiblePersonas.map((item) => <option key={item.id} value={item.id}>{getRecordValue(item, ['persona', 'persona_name', 'personaName']) || 'Persona'}</option>)}</select></label> : null}
            {personaFields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={formValues[field.key]}
                onChange={updateField}
              />
            ))}

            <div className="persona-actions">
              {!isInitialSetup ? (
                <button className="ghost-button" type="button" onClick={handleCreateNew} disabled={isSaving || isLoadingList || isLoadingDetail || limitLoading}>
                  New Persona
                </button>
              ) : null}
              <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving
                  ? 'Menyimpan...'
                  : isInitialSetup
                    ? 'Simpan & Lanjut'
                    : hasExistingConfig
                    ? 'Update Persona'
                    : 'Create Persona'}
              </button>
            </div>
          </form>
        </article>

      </section>
      {tipsOpen ? <div className="content-bank-dialog-backdrop" onClick={() => setTipsOpen(false)}><section className="content-bank-dialog idea-upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="persona-tips-title" onClick={(event) => event.stopPropagation()}><header><h2 id="persona-tips-title">Tips persona</h2><button type="button" aria-label="Tutup tips" onClick={() => setTipsOpen(false)}><AppIcon name="close" /></button></header><ul className="persona-tip-list"><li>Isi target audience dan niche dengan contoh yang konkret.</li><li>Pilih tone yang sesuai dengan gaya kontenmu.</li><li>Mulai dari versi sederhana, lalu perbaiki setelah disimpan.</li></ul></section></div> : null}
    </section>
  )
}
