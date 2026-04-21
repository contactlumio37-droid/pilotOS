import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, Minus, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import IndicatorDrawer from '@/components/modules/IndicatorDrawer'
import { useIndicators, useIndicatorValues } from '@/hooks/useIndicators'
import { useIsAtLeast } from '@/hooks/useRole'
import type { Indicator, IndicatorFrequency } from '@/types/database'

const FREQ_LABELS: Record<IndicatorFrequency, string> = {
  daily:     'Quotidien',
  weekly:    'Hebdo',
  monthly:   'Mensuel',
  quarterly: 'Trimestriel',
  yearly:    'Annuel',
}

// ── Sparkline card per indicator ──────────────────────────────

function IndicatorCard({
  indicator,
  onClick,
}: {
  indicator: Indicator
  onClick: () => void
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
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function IndicatorsPage() {
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [selected, setSelected]         = useState<Indicator | null>(null)

  const canCreate = useIsAtLeast('manager')

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

      {!isLoading && indicators.length === 0 && false && (
        <div className="card text-center py-12">
          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        </div>
      )}

      {!isLoading && indicators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {indicators.map(ind => (
            <IndicatorCard key={ind.id} indicator={ind} onClick={() => openEdit(ind)} />
          ))}
        </div>
      )}

      <IndicatorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        indicator={selected}
      />
    </div>
  )
}
