import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, Minus, PenLine, X } from 'lucide-react'
import { format } from 'date-fns'
import { subDays, subYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import IndicatorDrawer from '@/components/modules/IndicatorDrawer'
import { useIndicators, useIndicatorValues, useAddIndicatorValue } from '@/hooks/useIndicators'
import { useIsAtLeast } from '@/hooks/useRole'
import { useToast } from '@/components/ui/useToast'
import type { Indicator, IndicatorFrequency } from '@/types/database'

const FREQ_LABELS: Record<IndicatorFrequency, string> = {
  daily:     'Quotidien',
  weekly:    'Hebdo',
  monthly:   'Mensuel',
  quarterly: 'Trimestriel',
  yearly:    'Annuel',
}

// ── Value entry mini-modal ────────────────────────────────────

function ValueEntryModal({ indicator, onClose }: { indicator: Indicator; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const addValue = useAddIndicatorValue()
  const toast = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(value)
    if (isNaN(num)) return
    try {
      await addValue.mutateAsync({ indicator_id: indicator.id, value: num, measured_at: date, note: note || null, entered_by: null })
      toast.success('Valeur enregistrée')
      onClose()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-slate-900">Saisir une valeur</h3>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">{indicator.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Valeur{indicator.unit ? ` (${indicator.unit})` : ''} *</label>
            <input type="number" step="any" value={value} onChange={e => setValue(e.target.value)} className="input" placeholder="0" autoFocus required />
          </div>
          <div>
            <label className="label">Date de mesure *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="Commentaire..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={addValue.isPending} className="btn-primary flex-1">
              {addValue.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Full chart detail modal ───────────────────────────────────

type Period = '30j' | '90j' | '1an' | 'tout'

function IndicatorChartModal({ indicator, onClose, onEdit }: {
  indicator: Indicator
  onClose: () => void
  onEdit: () => void
}) {
  const [period, setPeriod] = useState<Period>('90j')
  const { data: values = [] } = useIndicatorValues(indicator.id)

  const cutoff = period === '30j'  ? subDays(new Date(), 30)
               : period === '90j'  ? subDays(new Date(), 90)
               : period === '1an'  ? subYears(new Date(), 1)
               : null

  const filtered = [...values]
    .filter(v => !cutoff || new Date(v.measured_at) >= cutoff)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))

  const chartData = filtered.map(v => ({
    v: v.value,
    d: format(new Date(v.measured_at), 'dd/MM', { locale: fr }),
    note: v.note,
  }))

  const latest = filtered[filtered.length - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">{indicator.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{FREQ_LABELS[indicator.frequency]}{indicator.unit ? ` · ${indicator.unit}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="btn-secondary text-xs py-1.5 px-3">Modifier</button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          {(['30j', '90j', '1an', 'tout'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === p ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'tout' ? 'Tout' : p}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl">
            Pas assez de données pour cette période
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v: number) => [`${v}${indicator.unit ? ` ${indicator.unit}` : ''}`, 'Valeur']}
                />
                {indicator.target_value != null && (
                  <ReferenceLine y={indicator.target_value} stroke="#10b981" strokeDasharray="4 2" label={{ value: `Cible: ${indicator.target_value}`, fill: '#10b981', fontSize: 10 }} />
                )}
                {indicator.warning_threshold != null && (
                  <ReferenceLine y={indicator.warning_threshold} stroke="#f59e0b" strokeDasharray="4 2" />
                )}
                {indicator.critical_threshold != null && (
                  <ReferenceLine y={indicator.critical_threshold} stroke="#ef4444" strokeDasharray="4 2" />
                )}
                <Line type="monotone" dataKey="v" stroke="#444ce7" strokeWidth={2} dot={{ r: 3, fill: '#444ce7' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Latest + target */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          {latest && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Dernière valeur :</span>
              <span className="font-semibold text-slate-900">{latest.value}{indicator.unit ? ` ${indicator.unit}` : ''}</span>
              <span className="text-slate-400">({format(new Date(latest.measured_at), 'd MMM yyyy', { locale: fr })})</span>
            </div>
          )}
          {indicator.target_value != null && latest && (
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-medium">
                {Math.round((latest.value / indicator.target_value) * 100)}% de l'objectif
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Sparkline card per indicator ──────────────────────────────

function IndicatorCard({
  indicator,
  onClick,
  onAddValue,
}: {
  indicator: Indicator
  onClick: () => void
  onAddValue: () => void
}) {
  const { data: values = [] } = useIndicatorValues(indicator.id)
  const sorted = [...values].sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const latest = sorted[sorted.length - 1]
  const prev   = sorted[sorted.length - 2]

  const chartData = sorted.slice(-12).map(v => ({
    v: v.value,
    d: format(new Date(v.measured_at), 'MM/yyyy', { locale: fr }),
  }))

  // Trend
  let TrendIcon = Minus
  let trendColor = 'text-slate-400'
  if (latest && prev) {
    if (latest.value > prev.value) { TrendIcon = TrendingUp; trendColor = 'text-emerald-500' }
    else if (latest.value < prev.value) { TrendIcon = TrendingDown; trendColor = 'text-red-500' }
  }

  // Status relative to thresholds
  let statusClass = 'border-slate-100'
  if (latest) {
    if (indicator.critical_threshold != null && latest.value <= indicator.critical_threshold) {
      statusClass = 'border-l-4 border-red-500'
    } else if (indicator.warning_threshold != null && latest.value <= indicator.warning_threshold) {
      statusClass = 'border-l-4 border-amber-400'
    } else if (indicator.target_value != null && latest.value >= indicator.target_value) {
      statusClass = 'border-l-4 border-emerald-500'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`card card-hover cursor-pointer ${statusClass}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{indicator.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{FREQ_LABELS[indicator.frequency]}</p>
        </div>
        <div className="text-right shrink-0">
          {latest ? (
            <>
              <div className="flex items-center gap-1 justify-end">
                <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                <span className="text-xl font-bold text-slate-900">
                  {latest.value}{indicator.unit ? <span className="text-sm font-normal text-slate-500 ml-0.5">{indicator.unit}</span> : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {format(new Date(latest.measured_at), 'd MMM', { locale: fr })}
              </p>
            </>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {chartData.length > 1 && (
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Tooltip
                contentStyle={{ fontSize: 11, padding: '2px 6px' }}
                formatter={(v: number) => [`${v}${indicator.unit ? ` ${indicator.unit}` : ''}`, '']}
                labelFormatter={(l) => l}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#444ce7"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Target progress */}
      {indicator.target_value != null && latest && (
        <div className="mt-2 pt-2 border-t border-slate-50">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Cible : {indicator.target_value}{indicator.unit ? ` ${indicator.unit}` : ''}</span>
            <span>{Math.round((latest.value / indicator.target_value) * 100)}%</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{ width: `${Math.min(100, Math.round((latest.value / indicator.target_value) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={e => { e.stopPropagation(); onAddValue() }}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium py-1.5 rounded-lg hover:bg-brand-50 transition-colors border border-brand-100"
      >
        <PenLine className="w-3.5 h-3.5" />
        Saisir une valeur
      </button>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function IndicatorsPage() {
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [selected, setSelected]             = useState<Indicator | null>(null)
  const [valueModalFor, setValueModalFor]   = useState<Indicator | null>(null)
  const [chartFor, setChartFor]             = useState<Indicator | null>(null)

  const canCreate = useIsAtLeast('manager')
  const canAddValue = useIsAtLeast('contributor')

  const { data: indicators = [], isLoading } = useIndicators()

  function openCreate() { setSelected(null); setDrawerOpen(true) }
  function openEdit(ind: Indicator) { setSelected(ind); setDrawerOpen(true) }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Indicateurs"
        subtitle="Suivi des indicateurs de performance"
        actions={
          canCreate ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> Nouvel indicateur
            </button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      )}

      {!isLoading && indicators.length === 0 && (
        <div className="card text-center py-12">
          <TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Aucun indicateur défini</p>
          <p className="text-sm text-slate-400 mt-1">Créez vos premiers indicateurs de performance.</p>
          {canCreate && (
            <button onClick={openCreate} className="btn-primary mt-4 text-sm">
              Créer le premier indicateur
            </button>
          )}
        </div>
      )}

      {!isLoading && indicators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {indicators.map(ind => (
            <IndicatorCard
              key={ind.id}
              indicator={ind}
              onClick={() => setChartFor(ind)}
              onAddValue={canAddValue ? () => setValueModalFor(ind) : () => openEdit(ind)}
            />
          ))}
        </div>
      )}

      <IndicatorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        indicator={selected}
      />

      <AnimatePresence>
        {valueModalFor && (
          <ValueEntryModal indicator={valueModalFor} onClose={() => setValueModalFor(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chartFor && (
          <IndicatorChartModal
            indicator={chartFor}
            onClose={() => setChartFor(null)}
            onEdit={() => { openEdit(chartFor); setChartFor(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
