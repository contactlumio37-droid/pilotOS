import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import Drawer from '@/components/ui/Drawer'
import { useCreateIndicator, useUpdateIndicator, useIndicatorValues, useAddIndicatorValue } from '@/hooks/useIndicators'
import { useIsAtLeast } from '@/hooks/useRole'
import type { Indicator, IndicatorFrequency, Visibility } from '@/types/database'

// ── Indicator form ────────────────────────────────────────────

const indicatorSchema = z.object({
  title:               z.string().min(1, 'Titre requis'),
  unit:                z.string().optional(),
  frequency:           z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const),
  target_value:        z.coerce.number().nullable().optional(),
  warning_threshold:   z.coerce.number().nullable().optional(),
  critical_threshold:  z.coerce.number().nullable().optional(),
  visibility:          z.enum(['public', 'managers', 'restricted', 'confidential'] as const),
})
type IndicatorForm = z.infer<typeof indicatorSchema>

// ── Value form ────────────────────────────────────────────────

const valueSchema = z.object({
  value:       z.coerce.number({ invalid_type_error: 'Valeur requise' }),
  measured_at: z.string().min(1, 'Date requise'),
  note:        z.string().optional(),
})
type ValueForm = z.infer<typeof valueSchema>

// ── Labels ────────────────────────────────────────────────────

const FREQ_LABELS: Record<IndicatorFrequency, string> = {
  daily:     'Quotidien',
  weekly:    'Hebdomadaire',
  monthly:   'Mensuel',
  quarterly: 'Trimestriel',
  yearly:    'Annuel',
}

const VISIBILITY_LABELS: Record<Visibility, string> = {
  public:       'Public',
  managers:     'Managers+',
  restricted:   'Restreint',
  confidential: 'Confidentiel',
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  indicator?: Indicator | null
}

export default function IndicatorDrawer({ open, onClose, indicator }: Props) {
  const isEdit    = !!indicator
  const canEdit   = useIsAtLeast('manager')
  const [tab, setTab] = useState<'form' | 'values'>('form')
  const [addingValue, setAddingValue] = useState(false)

  const createIndicator = useCreateIndicator()
  const updateIndicator = useUpdateIndicator()
  const addValue        = useAddIndicatorValue()

  const { data: values = [] } = useIndicatorValues(isEdit ? indicator!.id : null)

  // ── Indicator form ─────────────────────────────────────────
  const { register: regInd, handleSubmit: handleInd, reset: resetInd, formState: { errors: errInd } } =
    useForm<IndicatorForm>({
      resolver: zodResolver(indicatorSchema),
      defaultValues: {
        title: '', unit: '', frequency: 'monthly',
        target_value: null, warning_threshold: null, critical_threshold: null,
        visibility: 'public',
      },
    })

  // ── Value form ─────────────────────────────────────────────
  const { register: regVal, handleSubmit: handleVal, reset: resetVal, formState: { errors: errVal } } =
    useForm<ValueForm>({
      resolver: zodResolver(valueSchema),
      defaultValues: {
        value: 0,
        measured_at: new Date().toISOString().slice(0, 10),
        note: '',
      },
    })

  useEffect(() => {
    if (open) {
      setTab('form')
      setAddingValue(false)
      resetInd(indicator ? {
        title:              indicator.title,
        unit:               indicator.unit ?? '',
        frequency:          indicator.frequency,
        target_value:       indicator.target_value ?? null,
        warning_threshold:  indicator.warning_threshold ?? null,
        critical_threshold: indicator.critical_threshold ?? null,
        visibility:         indicator.visibility,
      } : {
        title: '', unit: '', frequency: 'monthly',
        target_value: null, warning_threshold: null, critical_threshold: null,
        visibility: 'public',
      })
    }
  }, [open, indicator, resetInd])

  async function onSubmitIndicator(data: IndicatorForm) {
    try {
      const payload = {
        title:              data.title,
        unit:               data.unit || null,
        frequency:          data.frequency,
        target_value:       data.target_value ?? null,
        warning_threshold:  data.warning_threshold ?? null,
        critical_threshold: data.critical_threshold ?? null,
        visibility:         data.visibility,
        visibility_user_ids: [],
        linked_to:          null as Indicator['linked_to'],
        linked_id:          null,
        owner_id:           null,
      }
      if (isEdit) {
        await updateIndicator.mutateAsync({ id: indicator!.id, ...payload })
      } else {
        await createIndicator.mutateAsync(payload)
      }
      onClose()
    } catch {}
  }

  async function onSubmitValue(data: ValueForm) {
    if (!indicator) return
    try {
      await addValue.mutateAsync({
        indicator_id: indicator.id,
        value:        data.value,
        measured_at:  data.measured_at,
        note:         data.note || null,
        entered_by:   null,
      })
      resetVal({ value: 0, measured_at: new Date().toISOString().slice(0, 10), note: '' })
      setAddingValue(false)
    } catch {}
  }

  const chartData = values.map(v => ({
    date:  format(new Date(v.measured_at), 'dd/MM', { locale: fr }),
    value: v.value,
  }))

  const isPending = createIndicator.isPending || updateIndicator.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? indicator!.title : 'Nouvel indicateur'}
      footer={
        tab === 'form' && canEdit ? (
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary flex items-center gap-1.5">
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              form="indicator-form"
              disabled={isPending}
              className="btn-primary flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Tabs */}
      {isEdit && (
        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
          {(['form', 'values'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'form' ? 'Paramètres' : `Mesures (${values.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Indicator form */}
      {tab === 'form' && (
        <form id="indicator-form" onSubmit={handleInd(onSubmitIndicator)} className="space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input {...regInd('title')} className="input" placeholder="Ex : Taux de service client" />
            {errInd.title && <p className="text-xs text-danger-500 mt-1">{errInd.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unité</label>
              <input {...regInd('unit')} className="input" placeholder="%, €, jours…" />
            </div>
            <div>
              <label className="label">Fréquence</label>
              <select {...regInd('frequency')} className="input">
                {(Object.entries(FREQ_LABELS) as [IndicatorFrequency, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Cible</label>
              <input {...regInd('target_value')} type="number" step="any" className="input" placeholder="100" />
            </div>
            <div>
              <label className="label">Seuil avertissement</label>
              <input {...regInd('warning_threshold')} type="number" step="any" className="input" placeholder="80" />
            </div>
            <div>
              <label className="label">Seuil critique</label>
              <input {...regInd('critical_threshold')} type="number" step="any" className="input" placeholder="60" />
            </div>
            <div>
              <label className="label">Visibilité</label>
              <select {...regInd('visibility')} className="input">
                {(Object.entries(VISIBILITY_LABELS) as [Visibility, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      )}

      {/* Values tab */}
      {tab === 'values' && (
        <div className="space-y-5">
          {/* Chart */}
          {chartData.length > 1 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  {indicator?.target_value != null && (
                    <ReferenceLine y={indicator.target_value} stroke="#444ce7" strokeDasharray="4 2" label={{ value: 'Cible', fontSize: 10 }} />
                  )}
                  {indicator?.warning_threshold != null && (
                    <ReferenceLine y={indicator.warning_threshold} stroke="#f59e0b" strokeDasharray="4 2" />
                  )}
                  {indicator?.critical_threshold != null && (
                    <ReferenceLine y={indicator.critical_threshold} stroke="#ef4444" strokeDasharray="4 2" />
                  )}
                  <Line type="monotone" dataKey="value" stroke="#444ce7" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Add value */}
          {canEdit && !addingValue && (
            <button
              onClick={() => setAddingValue(true)}
              className="btn-secondary w-full flex items-center justify-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" /> Ajouter une mesure
            </button>
          )}

          {addingValue && (
            <form onSubmit={handleVal(onSubmitValue)} className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valeur *</label>
                  <input {...regVal('value')} type="number" step="any" className="input" />
                  {errVal.value && <p className="text-xs text-danger-500 mt-1">{errVal.value.message}</p>}
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input {...regVal('measured_at')} type="date" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <input {...regVal('note')} className="input" placeholder="Optionnel" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddingValue(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={addValue.isPending} className="btn-primary text-sm">
                  {addValue.isPending ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          )}

          {/* Values list */}
          <div className="space-y-2">
            {values.length === 0 && !addingValue && (
              <p className="text-sm text-slate-400 text-center py-4">Aucune mesure enregistrée</p>
            )}
            {[...values].reverse().map(v => (
              <div key={v.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-500">{format(new Date(v.measured_at), 'd MMM yyyy', { locale: fr })}</span>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">
                    {v.value}{indicator?.unit ? ` ${indicator.unit}` : ''}
                  </span>
                  {v.note && <p className="text-xs text-slate-400">{v.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  )
}
