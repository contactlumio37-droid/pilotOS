import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Zap, GitBranch, FolderOpen, Users, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'

interface Result {
  id: string
  label: string
  sub?: string
  group: 'actions' | 'processes' | 'documents' | 'members'
  url: string
}

const GROUP_META = {
  actions:   { label: 'Actions',    Icon: Zap,       color: 'text-amber-500' },
  processes: { label: 'Processus',  Icon: GitBranch, color: 'text-blue-500' },
  documents: { label: 'Documents',  Icon: FolderOpen, color: 'text-green-500' },
  members:   { label: 'Membres',    Icon: Users,     color: 'text-purple-500' },
} as const

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { organisation } = useAuth()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !organisation?.id) { setResults([]); return }
    setLoading(true)
    const orgId = organisation.id
    const like = `%${q}%`

    const [actions, processes, documents, members] = await Promise.all([
      supabase.from('actions').select('id,title,status').eq('organisation_id', orgId).ilike('title', like).limit(5),
      supabase.from('processes').select('id,title,process_code').eq('organisation_id', orgId).ilike('title', like).limit(5),
      supabase.from('documents').select('id,title,doc_code').eq('organisation_id', orgId).ilike('title', like).limit(5),
      supabase.from('organisation_members').select('user_id,profiles(full_name,email)').eq('organisation_id', orgId).eq('is_active', true).limit(5),
    ])

    const res: Result[] = [
      ...(actions.data ?? []).map(a => ({ id: a.id, label: a.title, sub: a.status, group: 'actions' as const, url: '/app/actions' })),
      ...(processes.data ?? []).map(p => ({ id: p.id, label: p.title, sub: p.process_code, group: 'processes' as const, url: '/app/processus' })),
      ...(documents.data ?? []).map(d => ({ id: d.id, label: d.title, sub: d.doc_code, group: 'documents' as const, url: '/app/documents' })),
      ...(members.data ?? []).flatMap(m => {
        const p = m.profiles as { full_name?: string; email?: string } | null
        if (!p?.full_name) return []
        return [{ id: m.user_id, label: p.full_name, sub: p.email, group: 'members' as const, url: '/app/parametres/membres' }]
      }),
    ]

    setResults(res)
    setSelected(0)
    setLoading(false)
  }, [organisation?.id])

  useEffect(() => {
    const t = setTimeout(() => { void search(query) }, 200)
    return () => clearTimeout(t)
  }, [query, search])

  function go(result: Result) {
    navigate(result.url)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) go(results[selected])
  }

  const groups = (['actions', 'processes', 'documents', 'members'] as const).filter(g =>
    results.some(r => r.group === g)
  )

  let globalIdx = 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Rechercher une action, un processus, un document..."
                className="flex-1 py-4 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto py-2">
              {loading && (
                <div className="py-8 text-center text-sm text-slate-400">Recherche...</div>
              )}
              {!loading && query && results.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">Aucun résultat pour « {query} »</div>
              )}
              {!loading && !query && (
                <div className="py-8 text-center text-sm text-slate-400">
                  Tapez pour chercher dans vos actions, processus et documents.
                </div>
              )}
              {groups.map(group => {
                const meta = GROUP_META[group]
                const Icon = meta.Icon
                const items = results.filter(r => r.group === group)
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{meta.label}</span>
                    </div>
                    {items.map(item => {
                      const idx = globalIdx++
                      return (
                        <button
                          key={item.id}
                          onClick={() => go(item)}
                          onMouseEnter={() => setSelected(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            selected === idx ? 'bg-brand-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                            {item.sub && <p className="text-xs text-slate-400 truncate">{item.sub}</p>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
