import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../components/useToast'
import {
  generateContentOutputDemo,
  type GenerateContentOutputDemoPayload,
} from '../services/contentOutputs'

type DemoFieldKey = Exclude<keyof GenerateContentOutputDemoPayload, 'formatOutput'>

type ChatStep = {
  key: DemoFieldKey
  label: string
  assistant: string
  hint: string
  placeholder: string
  suggestions: string[]
}

type DemoResult = unknown
type PersistedDemoState = {
  currentStep: number
  formValues: GenerateContentOutputDemoPayload
  generatedResult: DemoResult
}

type CreateContentDemoPageProps = {
  isAuthenticated: boolean
  onRequestAuth: (mode: 'login' | 'register') => void
  onDemoSessionStart?: () => void
  onDemoSessionEnd?: () => void
  authCancelSignal?: number
}

const chatSteps: ChatStep[] = [
  {
    key: 'persona',
    label: 'Persona',
    assistant: 'Demo ini mau dipakai untuk persona siapa?',
    hint: 'Bikin singkat saja, cukup peran utama yang mau kamu target.',
    placeholder: 'Contoh: Creator educator',
    suggestions: ['Creator educator', 'Founder solo', 'Coach', 'Affiliate beginner'],
  },
  {
    key: 'targetAudience',
    label: 'Target Audience',
    assistant: 'Siapa audience paling cocok buat persona ini?',
    hint: 'Pilih yang paling dekat dengan target utama, nanti AI sisanya akan adaptasi.',
    placeholder: 'Contoh: Creator pemula',
    suggestions: ['Creator pemula', 'Small business owner', 'Personal brand builder', 'UMKM owner'],
  },
  {
    key: 'nicheTopicFocus',
    label: 'Topik',
    assistant: 'Topik utama yang mau dibahas apa?',
    hint: 'Cukup satu niche fokus biar demo tetap tajam.',
    placeholder: 'Contoh: Content strategy',
    suggestions: ['Personal branding', 'Content strategy', 'Monetisasi audience', 'Offer funnel'],
  },
  {
    key: 'contentStyle',
    label: 'Style',
    assistant: 'Gaya kontennya mau terasa seperti apa?',
    hint: 'Ini dipakai untuk bikin thread pendek yang sesuai persona.',
    placeholder: 'Contoh: Singkat, padat, insight-driven',
    suggestions: ['Singkat dan tajam', 'Story driven', 'Framework based', 'Insight heavy'],
  },
]

const emptyValues: GenerateContentOutputDemoPayload = {
  persona: '',
  targetAudience: '',
  nicheTopicFocus: '',
  contentStyle: '',
  formatOutput: 'threads pendek',
}

const DEMO_STORAGE_KEY = 'reframe.demoContentDraft'

function isFilled(value: string) {
  return value.trim().length > 0
}

function readPersistedDemoState(): PersistedDemoState | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined
  }

  const raw = localStorage.getItem(DEMO_STORAGE_KEY)

  if (!raw) {
    return undefined
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedDemoState> | null

    if (!parsed || typeof parsed !== 'object') {
      return undefined
    }

    const currentStep = typeof parsed.currentStep === 'number' ? parsed.currentStep : 0
    const formValues = parsed.formValues && typeof parsed.formValues === 'object'
      ? parsed.formValues
      : emptyValues

    return {
      currentStep,
      formValues: {
        persona: typeof formValues.persona === 'string' ? formValues.persona : '',
        targetAudience:
          typeof formValues.targetAudience === 'string' ? formValues.targetAudience : '',
        nicheTopicFocus:
          typeof formValues.nicheTopicFocus === 'string' ? formValues.nicheTopicFocus : '',
        contentStyle: typeof formValues.contentStyle === 'string' ? formValues.contentStyle : '',
        formatOutput: 'threads pendek',
      },
      generatedResult: parsed.generatedResult ?? null,
    }
  } catch {
    return undefined
  }
}

function persistDemoState(state: PersistedDemoState) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
}

function clearPersistedDemoState() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(DEMO_STORAGE_KEY)
}

function normalizeDraft(values: GenerateContentOutputDemoPayload) {
  return {
    persona: values.persona?.trim() || '',
    targetAudience: values.targetAudience?.trim() || '',
    nicheTopicFocus: values.nicheTopicFocus?.trim() || '',
    contentStyle: values.contentStyle?.trim() || '',
    formatOutput: 'threads pendek',
  }
}

function formatDemoResult(result: DemoResult) {
  function humanizeKey(key: string) {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  function primitiveToText(value: unknown) {
    if (typeof value === 'string') {
      const text = value.trim()
      return text || null
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    return null
  }

  function collectLines(value: unknown, depth = 0): string[] {
    if (value == null) {
      return []
    }

    const indent = '  '.repeat(depth)

    if (typeof value === 'string') {
      return value
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return [String(value)]
    }

    if (Array.isArray(value)) {
      return value.flatMap((item, index) => {
        const nested = collectLines(item, depth + 1)

        if (!nested.length) {
          return []
        }

        if (nested.length === 1) {
          return [`${indent}${index + 1}. ${nested[0]}`]
        }

        return [`${indent}${index + 1}. ${nested[0]}`, ...nested.slice(1).map((line) => `${indent}   ${line}`)]
      })
    }

    if (typeof value === 'object') {
      const source = value as Record<string, unknown>
      const lines: string[] = []
      const priorityKeys = ['title', 'headline', 'summary', 'hook', 'content', 'result', 'text', 'message']
      const arrayKeys = ['threads', 'items', 'outputs', 'results']
      const dataValue = source.data
      const parsedContentValue = source.parsed_content ?? (dataValue as Record<string, unknown> | undefined)?.parsed_content

      if (parsedContentValue !== undefined && parsedContentValue !== null) {
        const parsedLines = collectLines(parsedContentValue, depth)

        if (parsedLines.length) {
          lines.push(...parsedLines)
        }
      } else if (dataValue !== undefined && dataValue !== null) {
        const dataLines = collectLines(dataValue, depth)

        if (dataLines.length) {
          lines.push(...dataLines)
        }
      }

      priorityKeys.forEach((key) => {
        if (key === 'message' && lines.length) {
          return
        }

        const text = primitiveToText(source[key])

        if (text) {
          lines.push(text)
        }
      })

      arrayKeys.forEach((key) => {
        const maybeArray = source[key]

        if (!Array.isArray(maybeArray)) {
          return
        }

        maybeArray.forEach((item, index) => {
          const nested = collectLines(item, depth + 1)

          if (!nested.length) {
            return
          }

          if (nested.length === 1) {
            lines.push(`${index + 1}. ${nested[0]}`)
            return
          }

          lines.push(`${index + 1}. ${nested[0]}`)
          lines.push(...nested.slice(1).map((line) => `   ${line}`))
        })
      })

      Object.entries(source).forEach(([key, value]) => {
        if (priorityKeys.includes(key) || arrayKeys.includes(key) || key === 'data') {
          return
        }

        if (key === 'success' || key === 'ok' || key === 'status') {
          return
        }

        const text = primitiveToText(value)

        if (text) {
          lines.push(`${humanizeKey(key)}: ${text}`)
          return
        }

        const nested = collectLines(value, depth + 1)

        if (!nested.length) {
          return
        }

        lines.push(`${humanizeKey(key)}:`)
        lines.push(...nested.map((line) => `${indent}  ${line}`))
      })

      return lines
    }

    return []
  }

  const lines = collectLines(result).filter(Boolean)

  if (!lines.length) {
    return 'Demo berhasil dibuat, tetapi respons belum punya isi yang bisa ditampilkan.'
  }

  return lines.join('\n')
}

export function CreateContentDemoPage({
  isAuthenticated,
  onRequestAuth,
  onDemoSessionStart,
  onDemoSessionEnd,
  authCancelSignal = 0,
}: CreateContentDemoPageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const persistedState = readPersistedDemoState()
  const [formValues, setFormValues] = useState<GenerateContentOutputDemoPayload>(
    persistedState?.formValues ?? emptyValues,
  )
  const [currentStep, setCurrentStep] = useState(() =>
    Math.max(0, Math.min(persistedState?.currentStep ?? 0, chatSteps.length - 1)),
  )
  const [draftValue, setDraftValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingGenerateAfterAuth, setPendingGenerateAfterAuth] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [generatedResult, setGeneratedResult] = useState<DemoResult>(
    persistedState?.generatedResult ?? null,
  )
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)

  const currentStepConfig = chatSteps[currentStep] || chatSteps[chatSteps.length - 1]
  const currentValue = formValues[currentStepConfig.key]?.trim() || ''
  const progress = Math.round(((currentStep + 1) / chatSteps.length) * 100)
  const completedSteps = chatSteps.slice(0, currentStep)
  const isLastStep = currentStep === chatSteps.length - 1

  useEffect(() => {
    const activeValue = formValues[currentStepConfig.key] || ''
    setDraftValue(activeValue)
  }, [currentStep, currentStepConfig.key, formValues])

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

  useEffect(() => {
    if (!isAuthenticated || !pendingGenerateAfterAuth) {
      return
    }

    setPendingGenerateAfterAuth(false)
    setStatusTone('success')
    setStatusMessage('Akun siap dipakai. Klik Generate sekali lagi untuk lanjut.')
  }, [isAuthenticated, pendingGenerateAfterAuth])

  useEffect(() => {
    setPendingGenerateAfterAuth(false)
    setStatusTone('idle')
    setStatusMessage('')
  }, [authCancelSignal])

  useEffect(() => {
    if (!generatedResult || !resultRef.current) {
      return
    }

    resultRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [generatedResult])

  useEffect(() => {
    const hasDraft = chatSteps.some((step) => isFilled(formValues[step.key] || ''))

    if (!hasDraft && !generatedResult && currentStep === 0) {
      clearPersistedDemoState()
      return
    }

    persistDemoState({
      currentStep,
      formValues,
      generatedResult,
    })
  }, [currentStep, formValues, generatedResult])

  function updateField(key: DemoFieldKey, value: string) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }))
    setDraftValue(value)
  }

  function goNext() {
    setCurrentStep((current) => Math.min(current + 1, chatSteps.length - 1))
  }

  function handleSuggestionPick(value: string) {
    updateField(currentStepConfig.key, value)
    setStatusMessage('')
    setStatusTone('idle')

    if (currentStep < chatSteps.length - 1) {
      setCurrentStep((current) => Math.min(current + 1, chatSteps.length - 1))
    }
  }

  function requestGenerate() {
    if (generatedResult) {
      clearPersistedDemoState()
      onDemoSessionEnd?.()
      return
    }

    if (isAuthenticated) {
      void submitGenerate()
      return
    }

    setPendingGenerateAfterAuth(true)
    onDemoSessionStart?.()
    onRequestAuth('register')
    setStatusTone('idle')
    setStatusMessage('Buat akun dulu untuk lanjut ke demo content.')
  }

  async function submitGenerate() {
    if (generatedResult) {
      clearPersistedDemoState()
      onDemoSessionEnd?.()
      return
    }

    if (!isAuthenticated) {
      requestGenerate()
      return
    }

    const payload = normalizeDraft(formValues)

    if (
      !isFilled(payload.persona) ||
      !isFilled(payload.targetAudience) ||
      !isFilled(payload.nicheTopicFocus) ||
      !isFilled(payload.contentStyle)
    ) {
      setStatusTone('error')
      setStatusMessage('Isi dulu semua pertanyaan singkatnya sebelum generate.')
      setPendingGenerateAfterAuth(false)
      return
    }

    setIsGenerating(true)
    setStatusMessage('')
    setStatusTone('idle')

    try {
      const result = await generateContentOutputDemo(payload)
      setGeneratedResult(result)
      setStatusTone('success')
      setStatusMessage('Demo content berhasil dibuat.')
      toastSuccess('Demo ready', 'Demo content berhasil dibuat.')
      setPendingGenerateAfterAuth(false)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal generate demo content.'
      setStatusTone('error')
      setStatusMessage(errorMessage)
      toastError('Demo generate failed', errorMessage)
      setPendingGenerateAfterAuth(false)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleComposerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentValue) {
      setStatusTone('error')
      setStatusMessage('Isi jawaban step ini dulu sebelum lanjut.')
      return
    }

    setStatusMessage('')
    setStatusTone('idle')

    if (isLastStep) {
      if (generatedResult) {
        clearPersistedDemoState()
        onDemoSessionEnd?.()
        return
      }

      requestGenerate()
      return
    }

    goNext()
  }

  return (
    <section className="persona-chat-page content-demo-page">
      <div className="content-demo-bg" aria-hidden="true" />

      <header className="persona-chat-hero content-demo-hero">
        <div className="persona-chat-kicker content-demo-kicker">
          <span className="persona-chat-badge content-demo-badge">Free demo</span>
          <span>Trial singkat dulu, login baru untuk generate penuh</span>
        </div>
        <h1>Generate viral threads dalam 10 detik</h1>
        <p className="page-description">
          User bisa chat dulu dengan AI lewat pertanyaan singkat. Saat klik generate, barulah
          kami minta login atau sign up supaya hasil demo bisa diproses.
        </p>

        <div className="content-demo-hero-actions">
          <span className="content-demo-price content-demo-price-highlight">Gratis</span>
          {!isAuthenticated ? (
            <button
              className="ghost-button content-demo-hero-login-button"
              type="button"
              onClick={() => {
                onDemoSessionStart?.()
                onRequestAuth('login')
                setStatusTone('idle')
                setStatusMessage('Login dulu untuk lanjut ke demo content.')
              }}
            >
              Login
            </button>
          ) : null}
        </div>
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
                <p className="eyebrow">Quick Start</p>
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
                    Isi 4 jawaban singkat saja. Setelah itu, klik generate untuk lanjut ke login
                    atau sign up.
                  </p>
                </div>
              </div>

              {completedSteps.map((step) => {
                const answer = formValues[step.key]?.trim() || ''

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

              <div className="persona-chat-message assistant chat-enter chat-enter-current">
                <div className="persona-chat-avatar">AI</div>
                <div className="persona-chat-bubble">
                  <span className="persona-chat-label">Assistant</span>
                  <p>{currentStepConfig.assistant}</p>
                  <small>{currentStepConfig.hint}</small>
                </div>
              </div>

              {generatedResult ? (
                <div className="persona-chat-message assistant chat-enter chat-enter-current">
                  <div className="persona-chat-avatar">AI</div>
                  <div className="persona-chat-bubble content-demo-result-bubble" ref={resultRef}>
                    <span className="persona-chat-label">Assistant</span>
                    <div className="content-demo-result-head">
                      <p className="eyebrow">Hasil demo</p>
                      <span className="pill subtle">Preview</span>
                    </div>
                    <pre>{formatDemoResult(generatedResult)}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form className="persona-chat-composer" onSubmit={handleComposerSubmit}>
            <div className="persona-chat-composer-head">
              <div className="persona-chat-step-copy">
                <span className="persona-chat-label">Current field</span>
                <strong>{currentStepConfig.label}</strong>
              </div>

              <span className="persona-chat-answer-mode">
                {currentStepConfig.suggestions?.length
                  ? 'Pick a pill or type your own answer'
                  : 'Type your answer below'}
              </span>
            </div>

            <div className="persona-chat-choice-rail">
              <div className="persona-chat-choice-head">
                <span className="persona-chat-label">Quick picks</span>
                <span className="persona-chat-answer-mode subtle">Optional</span>
              </div>

              <div className="persona-chat-pills">
                {(currentStepConfig.suggestions || []).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={`chat-pill${draftValue === suggestion ? ' active' : ''}`}
                    onClick={() => handleSuggestionPick(suggestion)}
                    disabled={Boolean(generatedResult)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="persona-chat-input-card">
              <span className="persona-chat-input-label">Your answer</span>
              <input
                value={draftValue}
                onChange={(event) => updateField(currentStepConfig.key, event.target.value)}
                placeholder={currentStepConfig.placeholder}
                disabled={Boolean(generatedResult)}
              />

              <div className="persona-chat-composer-footer">
                <div className="persona-chat-step-copy">
                  <span className="persona-chat-label">Step note</span>
                  <strong>{currentStepConfig.hint}</strong>
                </div>

                <div className="persona-chat-action-row">
                  {isLastStep ? (
                    <button
                      className="primary-button chat-next-button"
                      type="submit"
                      disabled={generatedResult ? false : !draftValue.trim() || isGenerating}
                    >
                      {generatedResult ? 'Lanjut ke dashboard' : isGenerating ? 'Generating...' : 'Generate demo'}
                    </button>
                  ) : (
                    <button
                      className="primary-button chat-next-button"
                      type="submit"
                      disabled={!draftValue.trim() || Boolean(generatedResult)}
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
