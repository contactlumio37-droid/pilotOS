import { X, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DISMISSED_KEY = 'pilotos_demo_banner_dismissed'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(DISMISSED_KEY))

  if (dismissed) return null

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        className="relative mb-6 flex items-center gap-3 bg-gradient-to-r from-brand-600/10 to-purple-600/10 border border-brand-200 rounded-xl px-4 py-3"
      >
        <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
        <p className="text-sm text-slate-700 flex-1">
          <span className="font-semibold text-brand-700">Données de démonstration actives.</span>{' '}
          Ces données sont fictives et vous permettent d'explorer PilotOS librement.
        </p>
        <button
          onClick={dismiss}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors shrink-0"
          title="Masquer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
