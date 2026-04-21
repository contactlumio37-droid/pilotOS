import { useState, useEffect } from 'react'
import { RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import {
  ALL_KPI_DEFINITIONS, DEFAULT_KPI_CONFIG, useKpiConfig, useSaveKpiConfig,
} from '@/hooks/useDashboardKPIs'
import type { KpiId, KpiConfig } from '@/hooks/useDashboardKPIs'

interface KPIConfigDrawerProps {
  open: boolean
  onClose: () => void
}

export default function KPIConfigDrawer({ open, onClose }: KPIConfigDrawerProps) {
  const { data: savedConfig } = useKpiConfig()
  const save = useSaveKpiConfig()

  const [config, setConfig] = useState<KpiConfig>(DEFAULT_KPI_CONFIG)

  useEffect(() => {
    if (savedConfig) setConfig(savedConfig)
  }, [savedConfig, open])

  const allIds = Object.keys(ALL_KPI_DEFINITIONS) as KpiId[]

  function toggle(id: KpiId) {
    setConfig(prev => {
      const enabled = prev.enabled.includes(id)
        ? prev.enabled.filter(e => e !== id)
        : [...prev.enabled, id]
      const order = enabled.includes(id)
        ? prev.order.includes(id) ? prev.order : [...prev.order, id]
        : prev.order.filter(o => o !== id)
      return { enabled, order }
    })
  }

  function moveUp(id: KpiId) {
    setConfig(prev => {
      const order = [...prev.order]
      const i = order.indexOf(id)
      if (i <= 0) return prev
      ;[order[i - 1], order[i]] = [order[i], order[i - 1]]
      return { ...prev, order }
    })
  }

  function moveDown(id: KpiId) {
    setConfig(prev => {
      const order = [...prev.order]
      const i = order.indexOf(id)
      if (i === -1 || i >= order.length - 1) return prev
      ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
      return { ...prev, order }
    })
  }

  async function handleSave() {
    await save.mutateAsync(config)
    onClose()
  }

  // Items sorted: enabled first (in order), then disabled
  const enabledItems = config.order.filter(id => config.enabled.includes(id))
  const disabledItems = allIds.filter(id => !config.enabled.includes(id))

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Configurer les KPIs"
      width="sm"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setConfig(DEFAULT_KPI_CONFIG)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
          <button onClick={handleSave} disabled={save.isPending} className="btn-primary">
            {save.isPending ? 'Enregistrement…' : 'Appliquer'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-500 mb-4">
        Activez ou désactivez les indicateurs affichés sur votre tableau de bord. Utilisez les flèches pour réordonner.
      </p>

      <div className="space-y-2">
        {enabledItems.map((id, i) => (
          <div key={id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5 shadow-sm">
            <input
              type="checkbox"
              checked
              onChange={() => toggle(id)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="flex-1 text-sm font-medium text-slate-700">
              {ALL_KPI_DEFINITIONS[id].label}
            </span>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => moveUp(id)}
                disabled={i === 0}
                className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(id)}
                disabled={i === enabledItems.length - 1}
                className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {disabledItems.length > 0 && (
          <>
            <p className="text-xs text-slate-400 pt-2 pb-1">Désactivés</p>
            {disabledItems.map(id => (
              <div key={id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 opacity-60">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggle(id)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="flex-1 text-sm text-slate-500">{ALL_KPI_DEFINITIONS[id].label}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </Drawer>
  )
}
