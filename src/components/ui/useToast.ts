import { createContext, useContext } from 'react'

export interface ToastContextValue {
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
