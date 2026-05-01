import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useReducer, useState, type ReactNode } from 'react'
import {
  Plus, Zap, ChevronLeft, Trash2, ArrowUp, ArrowDown,
  ToggleLeft, ToggleRight, Clock, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/useToast'
import type { SuperadminAutomation, NewsletterTag } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

type AutomationTrigger =
  | 'org_created' | 'org_paid' | 'org_churned'
  | 'user_registered' | 'user_invited' | 'newsletter_subscribed' | 'scheduled'

type AutomationActionType =
  | 'send_email' | 'add_newsletter_tag' | 'remove_newsletter_tag'
  | 'send_slack_notification' | 'wait'

interface AutomationAction {
  type: AutomationActionType
  delay_minutes: number
  config: Record<string, unknown>
}

interface EditorState {
  name: string
  trigger_type: AutomationTrigger
  trigger_config: Record<string, unknown>
  actions: AutomationAction[]
  tags_filter: string[]
  is_active: boolean
}

type EditorActionMsg =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_TRIGGER'; payload: AutomationTrigger }
  | { type: 'SET_TRIGGER_CONFIG'; payload: Record<string, unknown> }
  | { type: 'ADD_ACTION' }
  | { type: 'UPDATE_ACTION'; index: number; payload: Partial<AutomationAction> }
  | { type: 'REMOVE_ACTION'; index: number }
  | { type: 'MOVE_ACTION'; from: number; to: number }
  | { type: 'SET_TAGS_FILTER'; payload: string[] }
  | { type: 'TOGGLE_ACTIVE' }
  | { type: 'LOAD'; payload: EditorState }

// ── Constants ─────────────────────────────────────────────────

const TRIGGER_CONFIG: Record<AutomationTrigger, { label: string; color: string; emoji: string }> = {
  org_created:           { label: 'Nouvelle org',       color: 'bg-violet-900 text-violet-300', emoji: '🏢' },
  org_paid:              { label: 'Passage payant',     color: 'bg-green-900 text-green-300',   emoji: '💳' },
  org_churned:           { label: 'Résiliation',        color: 'bg-red-900 text-red-300',       emoji: '🚪' },
  user_registered:       { label: 'Inscription',        color: 'bg-blue-900 text-blue-300',     emoji: '👤' },
  user_invited:          { label: 'Invitation acc.',    color: 'bg-cyan-900 text-cyan-300',     emoji: '✉️' },
  newsletter_subscribed: { label: 'Abonné newsletter',  color: 'bg-orange-900 text-orange-300', emoji: '📬' },
  scheduled:             { label: 'Planifié',           color: 'bg-slate-700 text-slate-300',   emoji: '📅' },
}

const ACTION_LABELS: Record<AutomationActionType, string> = {
  send_email:              'Envoyer un email',
  add_newsletter_tag:      'Ajouter un tag newsletter',
  remove_newsletter_tag:   'Retirer un tag newsletter',
  send_slack_notification: 'Notification Slack',
  wait:                    'Attendre',
}

const DEFAULT_ACTION: AutomationAction = {
  type: 'send_email',
  delay_minutes: 0,
  config: {},
}

const INITIAL_STATE: EditorState = {
  name: '',
  trigger_type: 'user_registered',
  trigger_config: {},
  actions: [],
  tags_filter: [],
  is_active: false,
}

// ── Reducer ───────────────────────────────────────────────────

function editorReducer(state: EditorState, msg: EditorActionMsg): EditorState {
  switch (msg.type) {
    case 'SET_NAME':          return { ...state, name: msg.payload }
    case 'SET_TRIGGER':       return { ...state, trigger_type: msg.payload, trigger_config: {} }
    case 'SET_TRIGGER_CONFIG': return { ...state, trigger_config: { ...state.trigger_config, ...msg.payload } }
    case 'ADD_ACTION':        return { ...state, actions: [...state.actions, { ...DEFAULT_ACTION }] }
    case 'UPDATE_ACTION': {
      const actions = state.actions.map((a, i) => i === msg.index ? { ...a, ...msg.payload } : a)
      return { ...state, actions }
    }
    case 'REMOVE_ACTION':     return { ...state, actions: state.actions.filter((_, i) => i !== msg.index) }
    case 'MOVE_ACTION': {
      const actions = [...state.actions]
      const [item] = actions.splice(msg.from, 1)
      actions.splice(msg.to, 0, item)
      return { ...state, actions }
    }
    case 'SET_TAGS_FILTER':   return { ...state, tags_filter: msg.payload }
    case 'TOGGLE_ACTIVE':     return { ...state, is_active: !state.is_active }
    case 'LOAD':              return msg.payload
    default:                  return state
  }
}

// ── Hooks ─────────────────────────────────────────────────────

function useAutomations() {
  return useQuery({
    queryKey: ['superadmin_automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('superadmin_automations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SuperadminAutomation[]
    },
  })
}

function useAutomationLogs(automationId: string | null) {
  return useQuery({
    queryKey: ['automation_logs', automationId],
    queryFn: async () => {
      if (!automationId) return []
      const { data, error } = await supabase
        .from('superadmin_automation_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!automationId,
  })
}

function useTags() {
  return useQuery({
    queryKey: ['newsletter_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('newsletter_tags').select('*').order('name')
      if (error) throw error
      return data as NewsletterTag[]
    },
  })
}

// ── WorkflowEditor ────────────────────────────────────────────

function WorkflowEditor({
  editingId,
  initialData,
  onBack,
}: {
  editingId: string | 'new'
  initialData: EditorState
  onBack: () => void
}) {
  const [state, dispatch] = useReducer(editorReducer, initialData)
  const { data: tags = [] } = useTags()
  const qc = useQueryClient()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!state.name.trim()) { toast.error('Le nom du workflow est requis'); return }
    setSaving(true)
    try {
      const payload = {
        name: state.name,
        is_active: state.is_active,
        trigger_type: state.trigger_type,
        trigger_config: state.trigger_config,
        actions: state.actions as unknown as Record<string, unknown>[],
        tags_filter: state.tags_filter,
        updated_at: new Date().toISOString(),
      }
      if (editingId === 'new') {
        const { error } = await supabase.from('superadmin_automations').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('superadmin_automations').update(payload).eq('id', editingId)
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['superadmin_automations'] })
      toast.success('Workflow sauvegardé')
      onBack()
    } catch { toast.error('Erreur lors de la sauvegarde') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce workflow ?')) return
    setDeleting(true)
    try {
      await supabase.from('superadmin_automations').delete().eq('id', editingId)
      qc.invalidateQueries({ queryKey: ['superadmin_automations'] })
      toast.success('Workflow supprimé')
      onBack()
    } catch { toast.error('Erreur lors de la suppression') } finally { setDeleting(false) }
  }

  const tc = TRIGGER_CONFIG[state.trigger_type]

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Retour aux automations
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trigger block */}
          <div className="bg-slate-800 border-2 border-brand-500/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{tc.emoji}</span>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Déclencheur</p>
            </div>
            <select
              value={state.trigger_type}
              onChange={e => dispatch({ type: 'SET_TRIGGER', payload: e.target.value as AutomationTrigger })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(Object.keys(TRIGGER_CONFIG) as AutomationTrigger[]).map(t => (
                <option key={t} value={t}>{TRIGGER_CONFIG[t].emoji} {TRIGGER_CONFIG[t].label}</option>
              ))}
            </select>
            {state.trigger_type === 'scheduled' && (
              <div className="mt-3">
                <label className="text-xs text-slate-400 block mb-1">Date/heure planifiée</label>
                <input
                  type="datetime-local"
                  value={(state.trigger_config.scheduled_at as string) ?? ''}
                  onChange={e => dispatch({ type: 'SET_TRIGGER_CONFIG', payload: { scheduled_at: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
          </div>

          {/* Connector */}
          {state.actions.length > 0 && <div className="flex justify-center"><div className="w-0.5 h-6 bg-slate-700" /></div>}

          {/* Action blocks */}
          {state.actions.map((action, i) => (
            <div key={i}>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    ⚡ Action {i + 1}
                  </p>
                  <div className="flex items-center gap-1">
                    {i > 0 && (
                      <button onClick={() => dispatch({ type: 'MOVE_ACTION', from: i, to: i - 1 })} className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {i < state.actions.length - 1 && (
                      <button onClick={() => dispatch({ type: 'MOVE_ACTION', from: i, to: i + 1 })} className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => dispatch({ type: 'REMOVE_ACTION', index: i })} className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Type d'action</label>
                    <select
                      value={action.type}
                      onChange={e => dispatch({ type: 'UPDATE_ACTION', index: i, payload: { type: e.target.value as AutomationActionType, config: {} } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {(Object.keys(ACTION_LABELS) as AutomationActionType[]).map(t => (
                        <option key={t} value={t}>{ACTION_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Délai (min avant)</label>
                    <input
                      type="number"
                      min={0}
                      value={action.delay_minutes}
                      onChange={e => dispatch({ type: 'UPDATE_ACTION', index: i, payload: { delay_minutes: Number(e.target.value) } })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Action-specific config */}
                {action.type === 'send_email' && (
                  <div className="space-y-2">
                    <input
                      value={(action.config.subject as string) ?? ''}
                      onChange={e => dispatch({ type: 'UPDATE_ACTION', index: i, payload: { config: { ...action.config, subject: e.target.value } } })}
                      placeholder="Sujet de l'email…"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <textarea
                      value={(action.config.body as string) ?? ''}
                      onChange={e => dispatch({ type: 'UPDATE_ACTION', index: i, payload: { config: { ...action.config, body: e.target.value } } })}
                      placeholder="Corps de l'email (HTML ou texte)…"
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>
                )}
                {(action.type === 'add_newsletter_tag' || action.type === 'remove_newsletter_tag') && (
                  <select
                    value={(action.config.tag_id as string) ?? ''}
                    onChange={e => dispatch({ type: 'UPDATE_ACTION', index: i, payload: { config: { ...action.config, tag_id: e.target.value } } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">— Sélectionner un tag —</option>
                    {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                {action.type === 'send_slack_notification' && (
                  <input
                    value={(action.config.webhook_url as string) ?? ''}
                    onChange={e => dispatch({ type: 'UPDATE_ACTION', index: i, payload: { config: { ...action.config, webhook_url: e.target.value } } })}
                    placeholder="URL du webhook Slack…"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>
              {i < state.actions.length - 1 && (
                <div className="flex justify-center mt-1"><div className="w-0.5 h-4 bg-slate-700" /></div>
              )}
            </div>
          ))}

          <button
            onClick={() => dispatch({ type: 'ADD_ACTION' })}
            className="w-full py-3 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-brand-500 hover:text-brand-400 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter une action
          </button>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nom du workflow *</label>
              <input
                value={state.name}
                onChange={e => dispatch({ type: 'SET_NAME', payload: e.target.value })}
                placeholder="Nom du workflow…"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {tags.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 block mb-2">Filtre newsletter (tags)</label>
                <div className="space-y-1.5">
                  {tags.map(t => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.tags_filter.includes(t.id)}
                        onChange={e => dispatch({
                          type: 'SET_TAGS_FILTER',
                          payload: e.target.checked
                            ? [...state.tags_filter, t.id]
                            : state.tags_filter.filter(id => id !== t.id),
                        })}
                        className="rounded border-slate-600"
                      />
                      <span className="text-sm text-slate-300">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">Actif dès la sauvegarde</span>
              <button onClick={() => dispatch({ type: 'TOGGLE_ACTIVE' })} className={`transition-colors ${state.is_active ? 'text-brand-400' : 'text-slate-600'}`}>
                {state.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Sauvegarde…' : 'Sauvegarder le workflow'}
            </button>

            {editingId !== 'new' && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-2.5 border border-red-700 text-red-400 rounded-xl text-sm hover:bg-red-900/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Suppression…' : 'Supprimer ce workflow'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Logs Drawer ───────────────────────────────────────────────

function LogsDrawer({ automationId, name, onClose }: { automationId: string; name: string; onClose: () => void }) {
  const { data: logs = [], isLoading } = useAutomationLogs(automationId)

  const STATUS_COLORS = {
    success: 'bg-green-900/50 text-green-400',
    error:   'bg-red-900/50 text-red-400',
    partial: 'bg-amber-900/50 text-amber-400',
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-[480px] bg-slate-900 border-l border-slate-800 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Logs — {name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">Aucune exécution enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log: Record<string, unknown>) => (
              <div key={log.id as string} className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[log.status as keyof typeof STATUS_COLORS] ?? 'bg-slate-700 text-slate-400'}`}>
                    {log.status as string}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.created_at as string).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {log.actions_run as number} action{(log.actions_run as number) !== 1 ? 's' : ''} exécutée{(log.actions_run as number) !== 1 ? 's' : ''}
                </p>
                {log.error_message && (
                  <p className="text-xs text-red-400 mt-1 font-mono">{log.error_message as ReactNode}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main AutomationsTab ───────────────────────────────────────

export default function AutomationsTab() {
  const { data: automations = [], isLoading } = useAutomations()
  const qc = useQueryClient()
  const toast = useToast()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [logsFor, setLogsFor] = useState<{ id: string; name: string } | null>(null)
  const [editingData, setEditingData] = useState<EditorState>(INITIAL_STATE)

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('superadmin_automations').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin_automations'] }),
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  function openCreate() {
    setEditingData(INITIAL_STATE)
    setEditingId('new')
  }

  function openEdit(a: SuperadminAutomation) {
    setEditingData({
      name: a.name,
      trigger_type: a.trigger_type as AutomationTrigger,
      trigger_config: a.trigger_config ?? {},
      actions: (a.actions ?? []) as unknown as AutomationAction[],
      tags_filter: a.tags_filter ?? [],
      is_active: a.is_active,
    })
    setEditingId(a.id)
  }

  if (editingId) {
    return (
      <WorkflowEditor
        editingId={editingId}
        initialData={editingData}
        onBack={() => setEditingId(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-sm text-slate-400 mt-1">Déclenchez des actions automatiquement selon des événements.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium">
          <Plus className="w-4 h-4" />
          Créer un workflow
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)}</div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucune automation configurée.</p>
          <p className="text-slate-600 text-sm mt-1">Créez votre premier workflow automatique.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(a => {
            const tc = TRIGGER_CONFIG[a.trigger_type as AutomationTrigger] ?? TRIGGER_CONFIG.user_registered
            return (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{a.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${tc.color}`}>
                      {tc.emoji} {tc.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {((a.actions ?? []) as unknown as AutomationAction[]).length} action{((a.actions ?? []) as unknown as AutomationAction[]).length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-slate-500">
                      {a.run_count} run{a.run_count !== 1 ? 's' : ''}
                    </span>
                    {a.last_run_at && (
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(a.last_run_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setLogsFor({ id: a.id, name: a.name })}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white transition-colors"
                  >
                    Logs
                  </button>
                  <button
                    onClick={() => openEdit(a)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => toggleActive.mutate({ id: a.id, is_active: !a.is_active })}
                    disabled={toggleActive.isPending}
                    className={`transition-colors disabled:opacity-50 ${a.is_active ? 'text-brand-400' : 'text-slate-600 hover:text-slate-400'}`}
                    title={a.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {a.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logsFor && (
        <LogsDrawer
          automationId={logsFor.id}
          name={logsFor.name}
          onClose={() => setLogsFor(null)}
        />
      )}
    </div>
  )
}
