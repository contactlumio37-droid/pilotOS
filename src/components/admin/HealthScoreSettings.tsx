import { useState } from 'react'
import { Activity, RotateCcw, Save } from 'lucide-react'
import { useHealthScoreConfig, useSaveHealthScoreConfig, DEFAULT_HEALTH_CONFIG } from '@/components/features/OrgHealthScore'
import type { HealthScoreConfig, HealthDimension } from '@/components/features/OrgHealthScore'
import { useOrganisation } from '@/hooks/useOrganisation'

const PLAN_ALLOWS_HEALTH_CONFIG = ['business', 'pro', 'enterprise']

export default function HealthScoreSettings() {
  const { organisation } = useOrganisation()
  const { data: savedConfig = DEFAULT_HEALTH_CONFIG, isLoading } = useHealthScoreConfig()
  const save = useSaveHealthScoreConfig()
  const [config, setConfig] = useState<HealthScoreConfig | null>(null)

  const plan = organisation?.plan ?? 'free'
  const allowed = PLAN_ALLOWS_HEALTH_CONFIG.includes(plan)

  const current = config ?? savedConfig

  function toggleEnabled() {
    setConfig({ ...current, enabled: !current.enabled })
  }

  function toggleDimension(id: string) {
    setConfig({
      ...current,
      dimensions: current.dimensions.map((d: HealthDimension) =>
        d.id === id ? { ...d, enabled: !d.enabled } : d
      ),
    })
  }

  function setWeight(id: string, weight: number) {
    setConfig({
      ...current,
      dimensions: current.dimensions.map((d: HealthDimension) =>
        d.id === id ? { ...d, weight } : d
      ),
    })
  }

  function setThreshold(id: string, key: 'threshold_green' | 'threshold_amber', value: number) {
    setConfig({
      ...current,
      dimensions: current.dimensions.map((d: HealthDimension) =>
        d.id === id ? { ...d, [key]: value } : d
      ),
    })
  }

  function handleReset() {
    setConfig(DEFAULT_HEALTH_CONFIG)
  }

  function handleSave() {
    if (!config) return
    save.mutate(config, { onSuccess: () => setConfig(null) })
  }

  const totalWeight = current.dimensions.filter((d: HealthDimension) => d.enabled).reduce((s: number, d: HealthDimension) => s + d.weight, 0)
  const isDirty = config !== null

  if (isLoading) return <div className="card animate-pulse h-48" />

  if (!allowed) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-700">Score de santé — Configuration</h3>
        </div>
        <p className="text-sm text-slate-500">
          La configuration du score de santé est disponible à partir du plan <span className="font-semibold">Business</span>.
        </p>
        <span className="badge badge-neutral mt-3 inline-block capitalize">{plan}</span>
      </div>
    )
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-brand-600" />
          <h3 className="font-semibold text-slate-700">Score de santé — Configuration</h3>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-slate-600">Activer</span>
          <div
            onClick={toggleEnabled}
            className={`relative w-10 h-6 rounded-full transition-colors ${current.enabled ? 'bg-brand-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${current.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </label>
      </div>

      {current.enabled && (
        <>
          <div className="space-y-5">
            {current.dimensions.map(d => (
              <div key={d.id} className={`space-y-3 p-4 rounded-xl border ${d.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-sm">{d.label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-500">Activée</span>
                    <div
                      onClick={() => toggleDimension(d.id)}
                      className={`relative w-8 h-5 rounded-full transition-colors ${d.enabled ? 'bg-brand-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                {d.enabled && (
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-slate-500 block mb-1">Poids (%)</label>
                      <input
                        type="number"
                        min={0} max={100}
                        value={d.weight}
                        onChange={e => setWeight(d.id, Number(e.target.value))}
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-emerald-600 block mb-1">Seuil vert (%)</label>
                      <input
                        type="number"
                        min={0} max={100}
                        value={d.threshold_green}
                        onChange={e => setThreshold(d.id, 'threshold_green', Number(e.target.value))}
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-amber-600 block mb-1">Seuil amber (%)</label>
                      <input
                        type="number"
                        min={0} max={100}
                        value={d.threshold_amber}
                        onChange={e => setThreshold(d.id, 'threshold_amber', Number(e.target.value))}
                        className="input w-full text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className={`text-sm font-medium ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Total des poids : {totalWeight}% {totalWeight !== 100 && '⚠ doit être égal à 100'}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5 text-sm">
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || totalWeight !== 100 || save.isPending}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {save.isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
