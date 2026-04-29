import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Save, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { SiteSection, Json } from '@/types/database'

const DEFAULT_SECTIONS: Omit<SiteSection, 'id' | 'updated_at' | 'updated_by'>[] = [
  {
    page: 'home',
    section: 'hero',
    desktop_content: {
      title: 'Pilotez votre organisation sans Excel',
      subtitle: 'PilotOS centralise stratégie, processus, actions et terrain.',
      cta_label: 'Essayer gratuitement',
      cta_url: '/register',
    },
    tablet_content: null,
    mobile_content: null,
    tablet_overrides: [],
    mobile_overrides: [],
    sort_order: 1,
    is_visible: true,
  },
]

function JsonEditor({
  value,
  onChange,
}: {
  value: Json
  onChange: (v: Json) => void
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const [error, setError] = useState<string | null>(null)

  function handleChange(raw: string) {
    setText(raw)
    try {
      onChange(JSON.parse(raw) as Json)
      setError(null)
    } catch {
      setError('JSON invalide')
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        rows={8}
        className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y ${
          error ? 'border-red-600' : 'border-slate-600'
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

interface SectionRowProps {
  section: SiteSection
  onSave: (id: string, content: Json) => void
  saving: boolean
}

function SectionRow({ section, onSave, saving }: SectionRowProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<Json>(section.desktop_content)

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full px-5 py-3 text-left hover:bg-slate-700/50 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{section.page} / {section.section}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${section.is_visible ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
          {section.is_visible ? 'Visible' : 'Caché'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 pt-2 border-t border-slate-700 space-y-3">
          <p className="text-xs text-slate-400">Contenu desktop (JSON)</p>
          <JsonEditor value={content} onChange={setContent} />
          <button
            onClick={() => onSave(section.id, content)}
            disabled={saving}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function CmsTab() {
  const qc = useQueryClient()
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['superadmin_cms'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_sections')
        .select('*')
        .order('sort_order')
      if (!data || data.length === 0) {
        await supabase.from('site_sections').insert(DEFAULT_SECTIONS)
        const { data: seeded } = await supabase
          .from('site_sections')
          .select('*')
          .order('sort_order')
        return (seeded ?? []) as SiteSection[]
      }
      return data as SiteSection[]
    },
  })

  const saveSection = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: Json }) => {
      const { error } = await supabase
        .from('site_sections')
        .update({ desktop_content: content, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_cms'] }),
  })

  async function handleSave(id: string, content: Json) {
    setSavingId(id)
    try {
      await saveSection.mutateAsync({ id, content })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">CMS Site</h2>
        <p className="text-slate-400 text-sm">Édition du contenu des sections de la landing page.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {sections.map(section => (
            <SectionRow
              key={section.id}
              section={section}
              onSave={handleSave}
              saving={savingId === section.id}
            />
          ))}
          {sections.length === 0 && (
            <p className="text-center py-8 text-slate-500">Aucune section trouvée.</p>
          )}
        </div>
      )}
    </div>
  )
}
