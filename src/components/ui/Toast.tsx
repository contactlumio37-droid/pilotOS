import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { ToastContext } from './useToast'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const success = useCallback((m: string) => add('success', m), [add])
  const error   = useCallback((m: string) => add('error',   m), [add])
  const info    = useCallback((m: string) => add('info',    m), [add])

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0,  scale: 1    }}
              exit={{    opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg min-w-[280px] max-w-sm text-sm font-medium ${STYLES[t.type].wrap}`}
            >
              {STYLES[t.type].icon}
              <span className={`flex-1 ${STYLES[t.type].text}`}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-1 opacity-50 hover:opacity-100 transition-opacity shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

const STYLES: Record<ToastType, { wrap: string; text: string; icon: ReactNode }> = {
  success: {
    wrap: 'bg-green-50 border-green-200',
    text: 'text-green-900',
    icon: <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />,
  },
  error: {
    wrap: 'bg-red-50 border-red-200',
    text: 'text-red-900',
    icon: <XCircle className="w-4 h-4 text-red-600 shrink-0" />,
  },
  info: {
    wrap: 'bg-blue-50 border-blue-200',
    text: 'text-blue-900',
    icon: <Info className="w-4 h-4 text-blue-600 shrink-0" />,
  },
}
