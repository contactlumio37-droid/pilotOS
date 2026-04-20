import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Target, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { StrategicObjective } from '@/types/database'

export default function DirectorDashboard() {
  const { organisation } = useOrganisation()

  const { data: objectives = [] } = useQuery({
    queryKey: ['strategic_objectives', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data } = await supabase
        .from('strategic_objectives')
        .select('*')
        .eq('organisation_id', organisation.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      return (data ?? []) as StrategicObjective[]
    },
    enabled: !!organisation,
  })

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Synthèse Direction</h1>

        {/* Objectifs stratégiques */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Objectifs stratégiques</h2>
            <button className="btn-primary text-sm">
              <Target className="w-4 h-4" />
              Nouvel objectif
            </button>
          </div>

          {objectives.length === 0 ? (
            <div className="card text-center py-8">
              <Target className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun objectif stratégique actif.</p>
              <p className="text-sm text-slate-400 mt-1">
                Définissez vos objectifs pour aligner vos équipes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {objectives.map((obj) => (
                <div key={obj.id} className="card-hover cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {obj.axis && (
                        <p className="text-xs text-slate-400 mb-1">{obj.axis}</p>
                      )}
                      <p className="font-semibold text-slate-900">{obj.title}</p>
                      {obj.kpi_label && (
                        <div className="flex items-center gap-2 mt-2">
                          <TrendingUp className="w-3 h-3 text-brand-500" />
                          <span className="text-sm text-slate-600">
                            {obj.kpi_label}
                            {obj.kpi_target && ` → ${obj.kpi_target}${obj.kpi_unit ?? ''}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="badge badge-brand text-xs shrink-0">Actif</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Placeholder graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card h-48 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Taux de réalisation actions</p>
              <p className="text-xs mt-1">Graphique disponible en V1</p>
            </div>
          </div>
          <div className="card h-48 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">KPIs consolidés</p>
              <p className="text-xs mt-1">Graphique disponible en V1</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
