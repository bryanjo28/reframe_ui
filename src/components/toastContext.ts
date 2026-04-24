import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  message: string
  tone: ToastTone
}

export type ToastContextValue = {
  pushToast: (toast: ToastInput) => void
  success: (title: string, message: string) => void
  error: (title: string, message: string) => void
  info: (title: string, message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
