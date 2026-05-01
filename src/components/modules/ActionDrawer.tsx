import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Send, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Drawer from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/useToast'
import { OriginBadge, StatusBadge, PriorityBadge } from '@/components/modules/ActionBadges'
import { useCreateAction, useUpdateAction, useActionComments, useAddComment } from '@/hooks/useActions'
import { useAiAssist } from '@/hooks/useAiAssist'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useProcesses } from '@/hooks/useProcesses'
import { useActionCategories } from '@/hooks/useActionCategories'
import { supabase } from '@/lib/supabase'
import RACISelector from '@/components/actions/RACISelector'
import { RACI_DEFAULT } from '@/components/actions/raci-types'
import type { RACIValue } from '@/components/actions/raci-types'
import type { ActionWithRelations, ActionInsertPayload } from '@/hooks/useActions'
import type { ActionStatus, ActionPriority, ActionOrigin } from '@/types/database'

const schema = z.object({
  title: z.string().min(3, 'Titre requis (3 caractères min)'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled', 'late']),
  origin: z.enum(['manual', 'process_review', 'codir', 'audit', 'incident', 'kaizen', 'terrain']),
  due_date: z.string().optional(),
  process_id: z.string().optional(),
  category_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ActionDrawerProps {
  open: boolean
  onClose: () => void
  action?: ActionWithRelations | null
  initialProcessId?: string
}

const STATUS_OPTIONS: { value: ActionStatus; label: string }[] = [
  { value: 'todo',        label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done',        label: 'Terminé' },
  { value: 'cancelled',   label: 'Annulé' },
]

const PRIORITY_OPTIONS: { value: ActionPriority; label: string }[] = [
  { value: 'low',      label: 'Basse' },
  { value: 'medium',   label: 'Moyenne' },
  { value: 'high',     label: 'Haute' },
  { value: 'critical', label: 'Critique' },
]

const ORIGIN_OPTIONS: { value: ActionOrigin; label: string }[] = [
  { value: 'manual',         label: 'Manuel' },
  { value: 'process_review', label: 'Revue process' },
  { value: 'codir',          label: 'CODIR' },
  { value: 'audit',          label: 'Audit' },
  { value: 'incident',       label: 'Incident' },
  { value: 'kaizen',         label: 'Kaizen' },
  { value: 'terrain',        label: 'Terrain' },
]

export default function ActionDrawer({ open, onClose, action, initialProcessId }: ActionDrawerProps) {
  const isEdit = !!action
  const [aiInput, setAiInput] = useState('')
  const [showAi, setShowAi] = useState(false)
  const [comment, setComment] = useState('')
  const [raci, setRaci] = useState<RACIValue>(RACI_DEFAULT)

  const toast = useToast()
  const createAction = useCreateAction()
  const updateAction = useUpdateAction()
  const { data: comments = [] } = useActionComments(action?.id ?? null)
  const addComment = useAddComment()
  const ai = useAiAssist()
  const { organisation } = useOrganisation()
  const { data: processes = [] } = useProcesses()
  const { data: categories = [] } = useActionCategories()
  const aiEnabled = (organisation as (typeof organisation & { ai_enabled?: boolean }) | null)?.ai_enabled ?? false

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['org-members-raci', organisation?.id],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('organisation_members')
        .select('user_id, profile:profiles(id, full_name)')
        .eq('organisation_id', organisation!.id)
        .eq('is_active', true)
      return (data ?? [])
        .map(m => {
          const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
          return p ? { id: p.id as string, full_name: p.full_name as string | null } : null
        })
        .filter((x): x is { id: string; full_name: string | null } => x !== null)
    },
  })

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      origin: 'manual',
      due_date: '',
    },
  })

  useEffect(() => {
    if (action) {
      reset({
        title: action.title,
        description: action.description ?? '',
        priority: action.priority,
        status: action.status,
        origin: action.origin,
        due_date: action.due_date ?? '',
        process_id: action.process_id ?? '',
        category_id: action.category_id ?? '',
      })
      setRaci({
        responsible_ids: action.responsible_ids?.length
          ? action.responsible_ids
          : action.responsible_id ? [action.responsible_id] : [],
        accountable_ids: action.accountable_ids?.length
          ? action.accountable_ids
          : action.accountable_id ? [action.accountable_id] : [],
        consulted_ids: action.consulted_ids ?? [],
        informed_ids: action.informed_ids ?? [],
      })
    } else {
      reset({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        origin: 'manual',
        due_date: '',
        process_id: initialProcessId ?? '',
        category_id: '',
      })
      setRaci(RACI_DEFAULT)
    }
    setShowAi(false)
    setAiInput('')
    setComment('')
  }, [action, open, reset, initialProcessId])

  async function onSubmit(data: FormData) {
    const payload: ActionInsertPayload = {
      title: data.title,
      description: data.description,
      origin: data.origin,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date || undefined,
      responsible_ids: raci.responsible_ids,
      accountable_ids: raci.accountable_ids,
      responsible_id: raci.responsible_ids[0] ?? undefined,
      accountable_id: raci.accountable_ids[0] ?? undefined,
      consulted_ids: raci.consulted_ids,
      informed_ids: raci.informed_ids,
      process_id: data.process_id || undefined,
      category_id: data.category_id || undefined,
    }
    try {
      if (isEdit) {
        await updateAction.mutateAsync({ id: action.id, ...payload })
        toast.success('Action mise à jour ✓')
      } else {
        await createAction.mutateAsync(payload)
        toast.success('Action créée ✓')
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message ?? 'Erreur lors de la sauvegarde')
    }
  }

  async function handleAiFill() {
    if (!aiInput.trim()) return
    const suggestion = await ai.fillAction(aiInput)
    if (!suggestion) return
    setValue('title', suggestion.title)
    setValue('description', suggestion.description)
    setValue('priority', suggestion.priority)
    setValue('origin', suggestion.origin)
    if (suggestion.suggestedDueDays > 0) {
      const due = new Date()
      due.setDate(due.getDate() + suggestion.suggestedDueDays)
      setValue('due_date', due.toISOString().slice(0, 10))
    }
    setShowAi(false)
    setAiInput('')
  }

  async function handleAddComment() {
    if (!comment.trim() || !action) return
    await addComment.mutateAsync({ actionId: action.id, content: comment })
    setComment('')
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier l\'action' : 'Nouvelle action'}
      width="lg"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="action-form"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      }
    >
      {/* IA Fill — uniquement si ai_enabled sur l'org */}
      {!isEdit && aiEnabled && (
        <div className="mb-6">
          {!showAi ? (
            <button
              type="button"
              onClick={() => setShowAi(true)}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Remplir avec l'IA
            </button>
          ) : (
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
              <p className="text-xs font-medium text-brand-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Décrivez l'action en langage naturel
              </p>
              <textarea
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Ex : Former les équipes terrain à la procédure de sécurité avant fin juin…"
                className="input text-sm resize-none"
                rows={2}
              />
              {ai.error && <p className="text-xs text-danger mt-1">{ai.error}</p>}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleAiFill}
                  disabled={ai.loading || !aiInput.trim()}
                  className="btn-primary py-1.5 text-sm"
                >
                  {ai.loading ? 'Génération…' : 'Générer'}
                </button>
                <button type="button" onClick={() => setShowAi(false)} className="btn-secondary py-1.5 text-sm">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(createAction.isError || updateAction.isError) && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          {(createAction.error as Error | null)?.message
            ?? (updateAction.error as Error | null)?.message
            ?? 'Une erreur est survenue. Réessayez.'}
        </div>
      )}

      {addComment.isError && (
        <div className="mb-2 bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">
          {(addComment.error as Error | null)?.message ?? 'Erreur lors de l\'ajout du commentaire.'}
        </div>
      )}

      <form id="action-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Titre */}
        <div>
          <label className="label">Titre *</label>
          <input {...register('title')} className="input" placeholder="Titre de l'action" />
          {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Détails, contexte…" />
        </div>

        {/* Priorité + Statut */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priorité</label>
            <select {...register('priority')} className="input">
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Statut</label>
            <select {...register('status')} className="input">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Origine + Échéance */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Origine</label>
            <select {...register('origin')} className="input">
              {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Échéance</label>
            <input {...register('due_date')} type="date" className="input" />
          </div>
        </div>

        {/* Catégorie + Processus */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Catégorie</label>
            <select {...register('category_id')} className="input">
              <option value="">— Aucune —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Processus lié</label>
            <select {...register('process_id')} className="input">
              <option value="">— Aucun —</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* RACI — création et modification */}
        <div className="pt-2 border-t border-slate-100">
          <RACISelector
            members={orgMembers}
            value={raci}
            onChange={setRaci}
          />
        </div>
      </form>

      {/* Badges métadonnées — modification uniquement */}
      {isEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <OriginBadge origin={action.origin} />
          <StatusBadge status={action.status} />
          <PriorityBadge priority={action.priority} />
          {action.due_date && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(action.due_date), 'd MMM yyyy', { locale: fr })}
            </span>
          )}
          {action.project && (
            <span className="text-xs text-slate-500">📁 {action.project.title}</span>
          )}
          {action.process && (
            <span className="text-xs text-slate-500">⚙️ {action.process.title}</span>
          )}
        </div>
      )}

      {/* Commentaires — modification uniquement */}
      {isEdit && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Commentaires {comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
          </h3>

          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                Aucun commentaire — soyez le premier à contribuer.
              </p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-brand-700">
                    {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-700">{c.author?.full_name ?? 'Utilisateur'}</span>
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(c.created_at), 'd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
              placeholder="Ajouter un commentaire…"
              className="input text-sm flex-1"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!comment.trim() || addComment.isPending}
              className="btn-primary px-3"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {action.status === 'late' && (
            <div className="mt-3 flex items-center gap-2 text-xs text-danger bg-danger-light rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Cette action est en retard. Mettez à jour le statut ou l'échéance.
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
