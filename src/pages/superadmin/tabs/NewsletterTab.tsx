import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Mail, CheckCircle, Clock, Tag, Settings, Plus, Trash2, X,
  Send, Eye, ChevronLeft, Users, Download, Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'
import BlockEditor, { type Block } from '@/components/editor/BlockEditor'
import { blocksToHtml } from '@/components/editor/blocksToHtml'
import type {
  NewsletterSubscriber, NewsletterTag, NewsletterCampaign, NewsletterCampaignStatus,
} from '@/types/database'

// suppress unused import warning
void (useMutation)

// ── Types ─────────────────────────────────────────────────────

type MainTab = 'subscribers' | 'campaigns' | 'tags' | 'config'

type SubscriberWithTags = NewsletterSubscriber & { tag_ids: string[] }

type EditorCampaign = {
  id: string | null
  subject: string
  preview_text: string
  content_blocks: Block[]
  segment_tag_ids: string[]
}

const EMPTY_CAMPAIGN: EditorCampaign = {
  id: null, subject: '', preview_text: '', content_blocks: [], segment_tag_ids: [],
}

const STATUS_LABELS: Record<NewsletterCampaignStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifiée',
  sent: 'Envoyée',
}

const STATUS_COLORS: Record<NewsletterCampaignStatus, string> = {
  draft: 'badge-neutral',
  scheduled: 'badge-warning',
  sent: 'badge-success',
}

// ── Hooks ─────────────────────────────────────────────────────

function useSubscribers() {
  return useQuery({
    queryKey: ['newsletter_subscribers'],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const { data: stags } = await supabase
        .from('newsletter_subscriber_tags')
        .select('subscriber_id, tag_id')

      const tagMap: Record<string, string[]> = {}
      for (const st of stags ?? []) {
        tagMap[st.subscriber_id] = [...(tagMap[st.subscriber_id] ?? []), st.tag_id]
      }

      return (subs as NewsletterSubscriber[]).map(s => ({
        ...s,
        tag_ids: tagMap[s.id] ?? [],
      })) as SubscriberWithTags[]
    },
  })
}

function useTags() {
  return useQuery({
    queryKey: ['newsletter_tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_tags')
        .select('*')
        .order('name')
      if (error) throw error
      return data as NewsletterTag[]
    },
  })
}

function useCampaigns() {
  return useQuery({
    queryKey: ['newsletter_campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as NewsletterCampaign[]
    },
  })
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ── Subscribers Tab ───────────────────────────────────────────

function SubscribersTab() {
  const { data: subscribers = [], isLoading } = useSubscribers()
  const { data: tags = [] } = useTags()
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)

  const confirmed = subscribers.filter(s => s.confirmed)
  const unconfirmed = subscribers.filter(s => !s.confirmed)
  const filtered = subscribers.filter(s => s.email.toLowerCase().includes(search.toLowerCase()))

  const tagCount = tags.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = subscribers.filter(s => s.tag_ids.includes(t.id)).length
    return acc
  }, {})

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet abonné ?')) return
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    qc.invalidateQueries({ queryKey: ['newsletter_subscribers'] })
    toast.success('Abonné supprimé')
  }

  async function handleToggleTag(subscriberId: string, tagId: string, hasTag: boolean) {
    if (hasTag) {
      await supabase.from('newsletter_subscriber_tags').delete()
        .eq('subscriber_id', subscriberId).eq('tag_id', tagId)
    } else {
      await supabase.from('newsletter_subscriber_tags').insert({ subscriber_id: subscriberId, tag_id: tagId })
    }
    qc.invalidateQueries({ queryKey: ['newsletter_subscribers'] })
  }

  function handleExportCSV() {
    const rows = confirmed.map(s => [s.email, s.confirmed_at ?? '', s.source ?? ''])
    const csv = [['Email', 'Confirmé le', 'Source'], ...rows]
      .map(r => r.map(c => `"${c}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'newsletter_subscribers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-4 h-4" />} label="Total" value={subscribers.length} color="text-white" />
        <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Confirmés" value={confirmed.length} color="text-green-400" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Non confirmés" value={unconfirmed.length} color="text-amber-400" />
        {tags.slice(0, 1).map(t => (
          <StatCard key={t.id} icon={<Tag className="w-3.5 h-3.5" />} label={t.name} value={tagCount[t.id] ?? 0} color="text-brand-400" />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email…"
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-1">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{s.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.confirmed ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {s.confirmed ? 'Confirmé' : 'Non confirmé'}
                  </span>
                  <span className="text-[10px] text-slate-500">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                  {s.tag_ids.map(tid => {
                    const tag = tags.find(t => t.id === tid)
                    return tag ? <span key={tid} className="text-[10px] bg-brand-900/40 text-brand-400 px-1.5 py-0.5 rounded font-medium">{tag.name}</span> : null
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {tags.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setEditingTagsId(editingTagsId === s.id ? null : s.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-700 transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    {editingTagsId === s.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-xl min-w-[150px]">
                        {tags.map(t => (
                          <button
                            key={t.id}
                            onClick={() => handleToggleTag(s.id, t.id, s.tag_ids.includes(t.id))}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              s.tag_ids.includes(t.id) ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-slate-500 py-10">Aucun abonné trouvé.</p>}
        </div>
      )}
    </div>
  )
}

// ── Campaign Editor ───────────────────────────────────────────

function CampaignEditor({
  initial, tags, subscribers, onBack,
}: {
  initial: EditorCampaign
  tags: NewsletterTag[]
  subscribers: SubscriberWithTags[]
  onBack: () => void
}) {
  const qc = useQueryClient()
  const toast = useToast()
  const [campaign, setCampaign] = useState<EditorCampaign>(initial)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)

  const confirmed = subscribers.filter(s => s.confirmed)
  const recipients = campaign.segment_tag_ids.length === 0
    ? confirmed
    : confirmed.filter(s => campaign.segment_tag_ids.some(tid => s.tag_ids.includes(tid)))

  async function saveCampaign(publish = false): Promise<string> {
    const payload = {
      subject: campaign.subject,
      preview_text: campaign.preview_text || null,
      content_blocks: campaign.content_blocks as unknown as Record<string, unknown>[],
      segment_tag_ids: campaign.segment_tag_ids,
      status: publish ? 'sent' as const : 'draft' as const,
      ...(publish ? { sent_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }
    if (campaign.id) {
      const { error } = await supabase.from('newsletter_campaigns').update(payload).eq('id', campaign.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['newsletter_campaigns'] })
      return campaign.id
    } else {
      const { data, error } = await supabase.from('newsletter_campaigns').insert(payload).select().single()
      if (error) throw error
      const newId = (data as NewsletterCampaign).id
      setCampaign(c => ({ ...c, id: newId }))
      qc.invalidateQueries({ queryKey: ['newsletter_campaigns'] })
      return newId
    }
  }

  async function handleSaveDraft() {
    try { await saveCampaign(false); toast.success('Brouillon sauvegardé') }
    catch { toast.error('Erreur lors de la sauvegarde') }
  }

  async function handleSend() {
    setSending(true)
    try {
      const id = await saveCampaign(true)
      let sent = 0; let failed = 0
      for (const sub of recipients) {
        const { error } = await supabase.functions.invoke('send-email', {
          body: { to: sub.email, subject: campaign.subject, html: blocksToHtml(campaign.content_blocks) },
        })
        if (error) failed++; else sent++
      }
      await supabase.from('newsletter_campaigns').update({ sent_count: sent, failed_count: failed }).eq('id', id)
      qc.invalidateQueries({ queryKey: ['newsletter_campaigns'] })
      toast.success(`${sent} email${sent !== 1 ? 's' : ''} envoyé${sent !== 1 ? 's' : ''}${failed > 0 ? ` · ${failed} échec${failed > 1 ? 's' : ''}` : ''}`)
      setConfirmSend(false)
      onBack()
    } catch { toast.error('Erreur lors de l\'envoi') } finally { setSending(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">
            <Eye className="w-3.5 h-3.5" />
            Prévisualiser
          </button>
          <button onClick={handleSaveDraft} className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">
            Brouillon
          </button>
          <button onClick={() => setConfirmSend(true)} disabled={!campaign.subject || recipients.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Send className="w-3.5 h-3.5" />
            Envoyer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Sujet *</label>
            <input value={campaign.subject} onChange={e => setCampaign(c => ({ ...c, subject: e.target.value }))} placeholder="Objet de la campagne…" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Texte de prévisualisation</label>
            <input value={campaign.preview_text} onChange={e => setCampaign(c => ({ ...c, preview_text: e.target.value }))} placeholder="Aperçu affiché dans les clients email…" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2">Contenu</label>
            <div className="bg-white rounded-xl">
              <BlockEditor blocks={campaign.content_blocks} onChange={blocks => setCampaign(c => ({ ...c, content_blocks: blocks }))} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Segmentation</p>
            <p className="text-xs text-slate-500">Laisser vide = tous les abonnés confirmés.</p>
            {tags.map(t => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={campaign.segment_tag_ids.includes(t.id)} onChange={e => setCampaign(c => ({ ...c, segment_tag_ids: e.target.checked ? [...c.segment_tag_ids, t.id] : c.segment_tag_ids.filter(id => id !== t.id) }))} className="rounded border-slate-600" />
                <span className="text-sm text-slate-300">{t.name}</span>
              </label>
            ))}
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-400"><span className="text-white font-semibold">{recipients.length}</span> destinataire{recipients.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="w-[600px] bg-white overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-800">Prévisualisation</h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: blocksToHtml(campaign.content_blocks) }} />
          </div>
        </div>
      )}

      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-white font-semibold">Confirmer l'envoi</h3>
            <p className="text-sm text-slate-400">Envoi à <span className="text-white font-semibold">{recipients.length}</span> abonné{recipients.length !== 1 ? 's' : ''}.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmSend(false)} className="px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">Annuler</button>
              <button onClick={handleSend} disabled={sending} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Envoi…' : 'Envoyer maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Campaigns Tab ─────────────────────────────────────────────

function CampaignsTab() {
  const { data: campaigns = [], isLoading } = useCampaigns()
  const { data: tags = [] } = useTags()
  const { data: subscribers = [] } = useSubscribers()
  const qc = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<EditorCampaign | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return
    const { error } = await supabase.from('newsletter_campaigns').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    qc.invalidateQueries({ queryKey: ['newsletter_campaigns'] })
    toast.success('Campagne supprimée')
  }

  if (editing) {
    return <CampaignEditor initial={editing} tags={tags} subscribers={subscribers} onBack={() => setEditing(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Campagnes</h2>
        <button onClick={() => setEditing(EMPTY_CAMPAIGN)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nouvelle campagne
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <p className="text-center text-slate-500 py-12">Aucune campagne. Créez votre première newsletter.</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.subject}</p>
                <p className="text-xs text-slate-500">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  {c.status === 'sent' && ` · ${c.sent_count} envoyés`}
                  {c.failed_count > 0 && ` · ${c.failed_count} échecs`}
                </p>
              </div>
              <span className={`badge text-xs ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
              <div className="flex items-center gap-1 shrink-0">
                {c.status === 'draft' && (
                  <button
                    onClick={() => setEditing({ id: c.id, subject: c.subject, preview_text: c.preview_text ?? '', content_blocks: (c.content_blocks ?? []) as unknown as Block[], segment_tag_ids: c.segment_tag_ids ?? [] })}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors"
                  >
                    Éditer
                  </button>
                )}
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tags Tab ──────────────────────────────────────────────────

function TagsTab() {
  const { data: tags = [], isLoading } = useTags()
  const { data: subscribers = [] } = useSubscribers()
  const qc = useQueryClient()
  const toast = useToast()
  const [newTag, setNewTag] = useState('')
  const [creating, setCreating] = useState(false)

  const tagCount = tags.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = subscribers.filter(s => s.tag_ids.includes(t.id)).length
    return acc
  }, {})

  async function handleCreate() {
    if (!newTag.trim()) return
    setCreating(true)
    const { error } = await supabase.from('newsletter_tags').insert({ name: newTag.trim() })
    setCreating(false)
    if (error) { toast.error('Erreur lors de la création'); return }
    qc.invalidateQueries({ queryKey: ['newsletter_tags'] })
    setNewTag('')
    toast.success('Tag créé')
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce tag ?')) return
    const { error } = await supabase.from('newsletter_tags').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    qc.invalidateQueries({ queryKey: ['newsletter_tags'] })
    toast.success('Tag supprimé')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Tags abonnés</h2>
        <div className="flex gap-2">
          <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Nom du tag…" className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
          <button onClick={handleCreate} disabled={creating || !newTag.trim()} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Plus className="w-4 h-4" />
            Créer
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : tags.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun tag. Créez des tags pour segmenter vos abonnés.</p>
      ) : (
        <div className="space-y-2">
          {tags.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
              <Tag className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="flex-1 text-sm text-white">{t.name}</span>
              <span className="text-xs text-slate-400">{tagCount[t.id] ?? 0} abonné{(tagCount[t.id] ?? 0) !== 1 ? 's' : ''}</span>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Config Tab ────────────────────────────────────────────────

function ConfigTab() {
  const [senderName, setSenderName] = useState('PilotOS')
  const [senderEmail, setSenderEmail] = useState('')
  const [unsubUrl, setUnsubUrl] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const toast = useToast()

  async function handleTestSend() {
    if (!testEmail) return
    setTesting(true)
    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: testEmail, subject: '[Test] Newsletter PilotOS', html: '<p>Ceci est un email de test depuis PilotOS.</p>' },
    })
    setTesting(false)
    if (error) { toast.error('Erreur lors de l\'envoi'); return }
    toast.success('Email de test envoyé !')
  }

  void senderName; void senderEmail; void unsubUrl
  void setSenderName; void setSenderEmail; void setUnsubUrl

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-lg font-semibold text-white">Configuration newsletter</h2>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Expéditeur</p>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Nom de l'expéditeur</label>
          <input value={senderName} onChange={e => setSenderName(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Email de l'expéditeur</label>
          <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} type="email" placeholder="newsletter@pilotos.io" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">URL de désinscription</label>
          <input value={unsubUrl} onChange={e => setUnsubUrl(e.target.value)} placeholder="https://pilotos.io/unsubscribe" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Test d'envoi</p>
        <div className="flex gap-2">
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} type="email" placeholder="votre@email.com" className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button onClick={handleTestSend} disabled={testing || !testEmail} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Send className="w-3.5 h-3.5" />
            {testing ? 'Envoi…' : 'Tester'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────

const TABS: { id: MainTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'subscribers', label: 'Abonnés',       icon: Users },
  { id: 'campaigns',   label: 'Campagnes',     icon: Mail },
  { id: 'tags',        label: 'Tags',          icon: Tag },
  { id: 'config',      label: 'Configuration', icon: Settings },
]

export default function NewsletterTab() {
  const [activeTab, setActiveTab] = useState<MainTab>('subscribers')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Newsletter</h1>

      <div className="flex items-center gap-0 border-b border-slate-700">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'subscribers' && <SubscribersTab />}
      {activeTab === 'campaigns'   && <CampaignsTab />}
      {activeTab === 'tags'        && <TagsTab />}
      {activeTab === 'config'      && <ConfigTab />}
    </div>
  )
}
