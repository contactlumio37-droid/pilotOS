import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'
import type { Json } from '@/types/database'

interface GlobalSeoData {
  site_title: string
  site_description: string
  og_image: string
  google_site_verification: string
}

const DEFAULT_SEO: GlobalSeoData = {
  site_title: 'PilotOS — Pilotez votre organisation',
  site_description: 'PilotOS centralise stratégie, processus, actions et terrain.',
  og_image: '',
  google_site_verification: '',
}

export default function SeoGlobalEditor() {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<GlobalSeoData>(DEFAULT_SEO)
  const [saving, setSaving] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['cms_seo_global'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_sections')
        .select('*')
        .eq('page', 'global')
        .eq('section', 'seo')
        .maybeSingle()
      if (data?.desktop_content) {
        setForm(data.desktop_content as unknown as GlobalSeoData)
      }
      return data
    },
  })

  async function handleSave() {
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('site_sections')
        .select('id')
        .eq('page', 'global')
        .eq('section', 'seo')
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('site_sections')
          .update({ desktop_content: form as unknown as Json, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('site_sections')
          .insert({
            page: 'global',
            section: 'seo',
            desktop_content: form as unknown as Json,
            tablet_content: null,
            mobile_content: null,
            tablet_overrides: [],
            mobile_overrides: [],
            sort_order: 0,
            is_visible: false,
          })
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['cms_seo_global'] })
      toast.success('SEO global sauvegardé')
    } catch { toast.error('Erreur lors de la sauvegarde') } finally { setSaving(false) }
  }

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-500"

  if (isLoading) return <div className="h-48 bg-slate-800 rounded-xl animate-pulse" />

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-lg font-semibold text-white">SEO Global</h2>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Titre du site</label>
          <input value={form.site_title} onChange={e => setForm(f => ({ ...f, site_title: e.target.value }))} placeholder="PilotOS — …" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Description par défaut</label>
          <textarea value={form.site_description} onChange={e => setForm(f => ({ ...f, site_description: e.target.value }))} rows={3} placeholder="Description du site…" className={`${inputClass} resize-none`} />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Image OG par défaut (URL)</label>
          <input value={form.og_image} onChange={e => setForm(f => ({ ...f, og_image: e.target.value }))} placeholder="https://…/og-image.png" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Google Search Console (meta verification)</label>
          <input value={form.google_site_verification} onChange={e => setForm(f => ({ ...f, google_site_verification: e.target.value }))} placeholder="xxxxxxxxxxxxx" className={inputClass} />
        </div>

        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde…' : 'Sauvegarder le SEO global'}
        </button>
      </div>
    </div>
  )
}
