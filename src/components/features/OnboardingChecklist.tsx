import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const KEY = 'pilotos_onboarding'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

interface ChecklistState {
  created_at: number
  dismissed: boolean
  checked: Record<string, boolean>
}

const ITEMS = [
  { id: 'profile', label: 'Compléter mon profil' },
  { id: 'member', label: 'Inviter un premier membre' },
  { id: 'process', label: 'Créer un processus' },
  { id: 'action', label: 'Créer une première action' },
  { id: 'kpi', label: 'Configurer un indicateur' },
]

function load(): ChecklistState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { created_at: Date.now(), dismissed: false, checked: {} }
    return JSON.parse(raw) as ChecklistState
  } catch {
    return { created_at: Date.now(), dismissed: false, checked: {} }
  }
}

function save(state: ChecklistState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* localStorage indisponible (navigation privée, quota) */ }
}

export default function OnboardingChecklist() {
  const [state, setState] = useState<ChecklistState>(load)
  const [collapsed, setCollapsed] = useState(false)

  const expired = Date.now() - state.created_at > TTL_MS
  const allDone = ITEMS.every(item => state.checked[item.id])

  useEffect(() => { save(state) }, [state])

  if (state.dismissed || expired || allDone) return null

  const done = ITEMS.filter(i => state.checked[i.id]).length
  const pct = Math.round((done / ITEMS.length) * 100)

  function toggle(id: string) {
    setState(s => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  }

  function dismiss() {
    setState(s => ({ ...s, dismissed: true }))
  }

  return (
    <div className="card mb-6 border border-brand-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Prise en main</h3>
            <p className="text-xs text-slate-500">{done}/{ITEMS.length} étapes complétées</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(c => !c)} className="text-slate-400 hover:text-slate-600 transition-colors">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {ITEMS.map(item => {
              const checked = !!state.checked[item.id]
              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggle(item.id)}
                    className="flex items-center gap-3 w-full text-left group"
                  >
                    {checked
                      ? <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                      : <Circle className="w-4 h-4 text-slate-300 group-hover:text-brand-400 shrink-0 transition-colors" />
                    }
                    <span className={`text-sm ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
