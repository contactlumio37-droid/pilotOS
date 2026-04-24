import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, Calendar, FileWarning, TrendingUp } from 'lucide-react'
import { useSecurityKPIs } from '@/hooks/useSecurity'

function KPICard({
  icon: Icon, label, value, sub, color, delay,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </motion.div>
  )
}

export default function SecurityDashboard() {
  const { data: kpis, isLoading } = useSecurityKPIs()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-28 bg-slate-100" />
        ))}
      </div>
    )
  }

  const daysColor = (kpis?.daysWithoutIncident ?? 0) >= 30
    ? 'bg-success-50 text-success-600'
    : (kpis?.daysWithoutIncident ?? 0) >= 7
    ? 'bg-amber-50 text-amber-600'
    : 'bg-danger-50 text-danger-600'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          icon={ShieldCheck}
          label="Jours sans incident"
          value={kpis?.daysWithoutIncident === 999 ? '∞' : kpis?.daysWithoutIncident ?? 0}
          sub={kpis?.lastIncidentDate ? `Dernier AT : ${new Date(kpis.lastIncidentDate).toLocaleDateString('fr-FR')}` : 'Aucun AT enregistré'}
          color={daysColor}
          delay={0}
        />
        <KPICard
          icon={AlertTriangle}
          label="AT ouverts"
          value={kpis?.atOpen ?? 0}
          color={(kpis?.atOpen ?? 0) > 0 ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600'}
          delay={0.05}
        />
        <KPICard
          icon={TrendingUp}
          label="Presqu'accidents"
          value={kpis?.nearMissOpen ?? 0}
          sub="Non traités"
          color={(kpis?.nearMissOpen ?? 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-success-50 text-success-600'}
          delay={0.1}
        />
        <KPICard
          icon={Calendar}
          label="Visites planifiées"
          value={kpis?.visitsPlanned ?? 0}
          sub="Prochains 30 jours"
          color="bg-brand-50 text-brand-600"
          delay={0.15}
        />
        <KPICard
          icon={FileWarning}
          label="Obligations en retard"
          value={kpis?.regulatoryOverdue ?? 0}
          color={(kpis?.regulatoryOverdue ?? 0) > 0 ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600'}
          delay={0.2}
        />
      </div>

      {/* Actions rapides */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card bg-amber-50 border-amber-200"
      >
        <h3 className="font-semibold text-amber-900 mb-1">Guide d&apos;utilisation du module</h3>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li><strong>DUER</strong> — Évaluation des risques par unité de travail (probabilité × gravité)</li>
          <li><strong>Incidents</strong> — Déclarez AT, presqu'accidents, situations dangereuses</li>
          <li><strong>Visites</strong> — Planifiez et tracez vos inspections terrain</li>
          <li><strong>Registre</strong> — Suivez vos obligations réglementaires et leurs échéances</li>
        </ul>
      </motion.div>
    </div>
  )
}
