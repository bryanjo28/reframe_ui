import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../components/useToast'
import {
  createPersonaConfig,
  updatePersonaConfig,
  type PersonaConfigPayload,
  type PersonaConfigRecord,
} from '../services/personaConfigs'

type PersonaFieldKey = keyof PersonaConfigPayload

type ChatStepKind = 'chips' | 'text' | 'textarea'

type ChatStep = {
  key: PersonaFieldKey
  label: string
  assistant: string
  hint: string
  kind: ChatStepKind
  placeholder: string
  suggestions?: string[]
}

type CreatePersonaChatPageProps = {
  personaConfig: PersonaConfigRecord | null
  isInitialSetup?: boolean
  onSaved?: (personaConfig: PersonaConfigRecord) => void
  title?: string
  description?: string
}

const chatSteps: ChatStep[] = [
  {
    key: 'persona',
    label: 'Persona',
    assistant: 'Sebelum mulai, persona utama ini siapa?',
    hint: 'Isi nama peran atau karakter utama yang mau kamu bangun.',
    kind: 'chips',
    placeholder: 'Tulis sendiri persona utamanya',
    suggestions: [
      'Growth mentor',
      'Creator educator',
      'Founder operator',
      'Personal brand strategist',
    ],
  },
  {
    key: 'targetAudience',
    label: 'Target Audience',
    assistant: 'Oke. Sekarang, siapa target audience utamanya?',
    hint: 'Pilih pill jika cocok, atau ketik sendiri kalau mau lebih spesifik.',
    kind: 'chips',
    placeholder: 'Contoh: Creator pemula yang ingin konsisten bikin konten',
    suggestions: [
      'Creator pemula',
      'Affiliate marketer',
      'Small business owner',
      'Personal brand builder',
    ],
  },
  {
    key: 'nicheTopicFocus',
    label: 'Niche / Topic Focus',
    assistant: 'Kalau niche atau topik fokusnya, kita arahkan ke mana?',
    hint: 'Ini akan bantu AI menjaga isi konten tetap tajam.',
    kind: 'chips',
    placeholder: 'Contoh: Personal branding dan content strategy',
    suggestions: [
      'Personal branding',
      'Content strategy',
      'Monetisasi audience',
      'Offer dan funnel',
    ],
  },
  {
    key: 'contentStyle',
    label: 'Content Style',
    assistant: 'Gaya kontennya mau terasa seperti apa?',
    hint: 'Pilih gaya yang paling dekat dengan cara kamu ingin tampil.',
    kind: 'chips',
    placeholder: 'Contoh: Singkat, padat, dan insight-driven',
    suggestions: [
      'Singkat dan tajam',
      'Framework based',
      'Story driven',
      'Insight heavy',
    ],
  },
  {
    key: 'tone',
    label: 'Tone',
    assistant: 'Tone yang paling cocok buat persona ini apa?',
    hint: 'Kamu juga bisa ketik tone custom kalau belum pas dengan pilihan.',
    kind: 'chips',
    placeholder: 'Contoh: Hangat, percaya diri, to the point',
    suggestions: [
      'Hangat, percaya diri, to the point',
      'Friendly dan ringan',
      'Authority dan edukatif',
      'Bold dan kontrarian',
    ],
  },
  {
    key: 'goal',
    label: 'Goal',
    assistant: 'Tujuan utama dari persona ini apa?',
    hint: 'Goal ini akan dipakai AI sebagai kompas saat menyusun konten.',
    kind: 'text',
    placeholder: 'Contoh: Bangun trust, tingkatkan engagement, dan dorong klik',
  },
  {
    key: 'platform',
    label: 'Platform',
    assistant: 'Platform utamanya di mana?',
    hint: 'Kamu bisa pilih platform paling dominan dulu.',
    kind: 'chips',
    placeholder: 'Contoh: Threads',
    suggestions: ['Threads', 'Instagram', 'X / Twitter', 'LinkedIn'],
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

function getFirstIncompleteStep(values: PersonaConfigPayload) {
  const index = chatSteps.findIndex((step) => !values[step.key].trim())
  return index === -1 ? 0 : index
}

export function CreatePersonaChatPage({
  personaConfig,
  isInitialSetup = false,
  onSaved,
  title = 'Persona',
  description,
}: CreatePersonaChatPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [formValues, setFormValues] = useState<PersonaConfigPayload>(() =>
    createFormValuesFromConfig(personaConfig),
  )
  const [currentStep, setCurrentStep] = useState(() => getFirstIncompleteStep(formValues))
  const [draftValue, setDraftValue] = useState(() => formValues[chatSteps[0].key] || '')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [savedRecord, setSavedRecord] = useState<PersonaConfigRecord | null>(personaConfig)
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const nextValues = createFormValuesFromConfig(personaConfig)
    setFormValues(nextValues)
    setSavedRecord(personaConfig)
    const nextStep = getFirstIncompleteStep(nextValues)
    setCurrentStep(nextStep)
    setDraftValue(nextValues[chatSteps[nextStep]?.key || chatSteps[0].key] || '')
    setStatusMessage('')
    setStatusTone('idle')
  }, [personaConfig])

  useEffect(() => {
    const activeKey = chatSteps[currentStep]?.key || chatSteps[0].key
    setDraftValue(formValues[activeKey] || '')
  }, [currentStep, formValues])

  const currentStepConfig = chatSteps[currentStep] || chatSteps[chatSteps.length - 1]
  const currentValue = formValues[currentStepConfig.key].trim()
  const progress = Math.round(((currentStep + 1) / chatSteps.length) * 100)
  const completedSteps = chatSteps.slice(0, currentStep)
  const isLastStep = currentStep === chatSteps.length - 1

  useEffect(() => {
    const transcript = transcriptRef.current

    if (!transcript) {
      return
    }

    const targetTop = transcript.scrollHeight - transcript.clientHeight
    transcript.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    })
  }, [currentStep, completedSteps.length, currentStepConfig.key])

  function updateField(key: PersonaFieldKey, value: string) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }))
    setDraftValue(value)
  }

  function goNext() {
    setCurrentStep((current) => Math.min(current + 1, chatSteps.length - 1))
  }

  function goBack() {
    setCurrentStep((current) => Math.max(current - 1, 0))
  }

  function handleSuggestionPick(value: string) {
    updateField(currentStepConfig.key, value)
    setStatusMessage('')
    setStatusTone('idle')

    if (currentStep < chatSteps.length - 1) {
      setCurrentStep((current) => Math.min(current + 1, chatSteps.length - 1))
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentValue) {
      setStatusTone('error')
      setStatusMessage('Isi dulu jawaban pada step ini sebelum lanjut.')
      return
    }

    setIsSaving(true)
    setStatusMessage('')

    try {
      const personaId = savedRecord?.id
      const wasExistingRecord = Boolean(personaId)
      const nextRecord = personaId
        ? await updatePersonaConfig(personaId, formValues)
        : await createPersonaConfig(formValues)

      setSavedRecord(nextRecord)
      setStatusTone('success')
      const successMessage = wasExistingRecord
        ? 'Persona config berhasil diperbarui lewat chat flow.'
        : 'Persona config berhasil dibuat lewat chat flow.'

      setStatusMessage(successMessage)
      toastSuccess(wasExistingRecord ? 'Persona updated' : 'Persona created', successMessage)
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

  return (
    <section className="persona-chat-page">
      <div className="persona-chat-bg" aria-hidden="true" />

      <header className="persona-chat-hero">
        <h1>{title}</h1>
        <p className="page-description">
          {description ||
            (isInitialSetup
              ? 'Bayangin ini seperti ngobrol dengan AI. Setiap pertanyaan sudah kita arahkan, jadi user tinggal jawab step by step lewat pill atau isi sendiri.'
              : 'Flow ini bisa dipakai juga untuk edit persona yang sudah ada, tanpa menghapus form lama.')}
        </p>
      </header>

      {statusMessage ? (
        <div className={`integration-note ${statusTone === 'error' ? 'integration-note-error' : ''}`}>
          <p>{statusMessage}</p>
        </div>
      ) : null}

      <section className="persona-chat-layout">
        <article className="panel persona-chat-panel">
          <div className="persona-chat-stage">
            <div className="persona-chat-stage-head">
              <div>
                <p className="eyebrow">Persona Wizard</p>
                <h2>{currentStepConfig.assistant}</h2>
              </div>
              <span className="pill subtle">
                Step {currentStep + 1}/{chatSteps.length}
              </span>
            </div>

            <div className="persona-chat-progress">
              <div
                className="persona-chat-progress-bar"
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>

            <div className="persona-chat-transcript" ref={transcriptRef}>
              <div className="persona-chat-message assistant chat-enter chat-enter-soft">
                <div className="persona-chat-avatar">AI</div>
                <div className="persona-chat-bubble">
                  <span className="persona-chat-label">Assistant</span>
                  <p>
                    Kita mulai pelan-pelan. Jawab saja satu per satu, dan kalau mau cepat
                    pakai pill yang sudah disiapkan.
                  </p>
                </div>
              </div>

              {completedSteps.map((step) => {
                const answer = formValues[step.key].trim()

                return (
                  <div className="persona-chat-thread chat-thread-enter" key={step.key}>
                    <div className="persona-chat-message assistant chat-enter">
                      <div className="persona-chat-avatar">AI</div>
                      <div className="persona-chat-bubble">
                        <span className="persona-chat-label">Assistant</span>
                        <p>{step.assistant}</p>
                      </div>
                    </div>
                    <div className="persona-chat-message user chat-enter chat-enter-user">
                      <div className="persona-chat-avatar user">You</div>
                      <div className="persona-chat-bubble user">
                        <span className="persona-chat-label">You</span>
                        <p>{answer}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {currentStep >= 0 ? (
                <div className="persona-chat-message assistant chat-enter chat-enter-current">
                  <div className="persona-chat-avatar">AI</div>
                  <div className="persona-chat-bubble">
                    <span className="persona-chat-label">Assistant</span>
                    <p>{currentStepConfig.assistant}</p>
                    <small>{currentStepConfig.hint}</small>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form className="persona-chat-composer" onSubmit={handleSave}>
            <div className="persona-chat-composer-head">
              <div className="persona-chat-step-copy">
                <span className="persona-chat-label">Current field</span>
                <strong>{currentStepConfig.label}</strong>
              </div>

              <span className="persona-chat-answer-mode">
                {currentStepConfig.suggestions?.length
                  ? 'Pick a pill or type your own answer'
                  : currentStepConfig.kind === 'textarea'
                    ? 'Type a longer answer'
                    : 'Type your answer below'}
              </span>
            </div>

            {currentStepConfig.suggestions?.length ? (
              <div className="persona-chat-choice-rail">
                <div className="persona-chat-choice-head">
                  <span className="persona-chat-label">Quick picks</span>
                  {/* <span className="persona-chat-answer-mode subtle">Optional</span> */}
                </div>

                <div className="persona-chat-pills">
                  {currentStepConfig.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`chat-pill${draftValue === suggestion ? ' active' : ''}`}
                      onClick={() => handleSuggestionPick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="persona-chat-input-card">
              <span className="persona-chat-input-label">Your answer</span>
              {currentStepConfig.kind === 'textarea' ? (
                <textarea
                  value={draftValue}
                  onChange={(event) => updateField(currentStepConfig.key, event.target.value)}
                  placeholder={currentStepConfig.placeholder}
                  rows={4}
                />
              ) : (
                <input
                  value={draftValue}
                  onChange={(event) => updateField(currentStepConfig.key, event.target.value)}
                  placeholder={currentStepConfig.placeholder}
                />
              )}

              <div className="persona-chat-composer-footer">
                <div className="persona-chat-step-copy">
                  <span className="persona-chat-label">Step note</span>
                  <strong>{currentStepConfig.hint}</strong>
                </div>

              <div className="persona-chat-action-row">
                <button
                  className="ghost-button chat-back-button"
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 0}
                >
                  Back
                </button>
                {isLastStep ? (
                  <button
                    className="primary-button chat-next-button"
                    type="submit"
                    disabled={!draftValue.trim() || isSaving}
                  >
                    {isSaving ? 'Menyimpan...' : 'Save Persona'}
                  </button>
                ) : (
                  <button
                    className="primary-button chat-next-button"
                    type="button"
                    disabled={!draftValue.trim()}
                    onClick={goNext}
                  >
                    Next
                  </button>
                )}
                </div>
              </div>
            </div>
          </form>
        </article>

      </section>
    </section>
  )
}
