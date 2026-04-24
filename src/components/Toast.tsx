import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastContextValue, type ToastInput, type ToastTone } from './toastContext'

type ToastItem = ToastInput & {
  id: string
}

function buildToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return <span aria-hidden="true">✓</span>
  }

  if (tone === 'error') {
    return <span aria-hidden="true">!</span>
  }

  return <span aria-hidden="true">i</span>
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const pushToast = useCallback((toast: ToastInput) => {
    const nextToast: ToastItem = {
      ...toast,
      id: buildToastId(),
    }

    setToasts((current) => [nextToast, ...current].slice(0, 4))

    window.setTimeout(() => {
      removeToast(nextToast.id)
    }, 3200)
  }, [removeToast])

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      success: (title, message) => pushToast({ tone: 'success', title, message }),
      error: (title, message) => pushToast({ tone: 'error', title, message }),
      info: (title, message) => pushToast({ tone: 'info', title, message }),
    }),
    [pushToast],
  )

  useEffect(() => {
    return () => {
      setToasts([])
    }
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <div className="toast-icon">
              <ToastIcon tone={toast.tone} />
            </div>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button className="toast-close" type="button" onClick={() => removeToast(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
