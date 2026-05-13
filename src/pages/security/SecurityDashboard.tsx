import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, Calendar, FileWarning, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { useSecurityKPIs, useIncidents, useSafetyVisits, useRegulatoryRegister } from '@/hooks/useSecurity'
import { addDays, isWithinInterval, startOfDay } from 'date-fns'

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

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  accident:            'Accident du travail',
  near_miss:           "Presqu'accident",
  dangerous_situation: 'Situation dangereuse',
  first_aid:           'Premiers secours',
}

const INCIDENT_STATUS_COLOR: Record<string, string> = {
  open:               'bg-danger-50 text-danger-600',
  under_analysis:     'bg-amber-50 text-amber-700',
  action_in_progress: 'bg-brand-50 text-brand-600',
  closed:             'bg-success-50 text-success-600',
}

const INCIDENT_STATUS_LABEL: Record<string, string> = {
  open:               'Ouvert',
  under_analysis:     'Analyse',
  action_in_progress: 'En cours',
  closed:             'Clôturé',
}

const VISIT_TYPE_LABEL: Record<string, string> = {
  planned:     'Visite planifiée',
  unannounced: 'Visite inopinée',
  audit:       'Audit',
  inspection:  'Inspection',
}

export default function SecurityDashboard() {
  const { data: kpis, isLoading } = useSecurityKPIs()
  const { data: incidents = [] } = useIncidents()
  const { data: visits = [] } = useSafetyVisits()
  const { data: regulatory = [] } = useRegulatoryRegister()

  const recentIncidents = incidents.slice(0, 5)

  const today = startOfDay(new Date())
  const in30 = addDays(today, 30)
  const upcomingVisits = visits
    .filter(v => v.status === 'planned' && isWithinInterval(new Date(v.planned_at), { start: today, end: in30 }))
    .slice(0, 5)

  const overdueReg = regulatory.filter(r => r.status === 'overdue').slice(0, 5)

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent incidents */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger-500" />
            Incidents récents
          </h3>
          {recentIncidents.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-success-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Aucun incident enregistré</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentIncidents.map(inc => (
                <div key={inc.id} className="flex items-start gap-2 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inc.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(inc.occurred_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      {' · '}{INCIDENT_TYPE_LABEL[inc.incident_type] ?? inc.incident_type}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${INCIDENT_STATUS_COLOR[inc.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {INCIDENT_STATUS_LABEL[inc.status] ?? inc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming visits */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-500" />
            Visites à venir (30 j)
          </h3>
          {upcomingVisits.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Aucune visite planifiée</p>
            </div>
          ) : (
            <div className="space-y-0">
              {upcomingVisits.map(v => {
                const planned = new Date(v.planned_at)
                const daysLeft = Math.ceil((planned.getTime() - today.getTime()) / 86400000)
                return (
                  <div key={v.id} className="flex items-start gap-2 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{VISIT_TYPE_LABEL[v.visit_type] ?? v.visit_type}</p>
                      {v.scope && <p className="text-xs text-slate-400 truncate mt-0.5">{v.scope}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {planned.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${daysLeft <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-600'}`}>
                      J-{daysLeft}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Overdue regulatory */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-danger-500" />
            Obligations en retard
          </h3>
          {overdueReg.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-success-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Toutes les obligations sont à jour</p>
            </div>
          ) : (
            <div className="space-y-0">
              {overdueReg.map(r => (
                <div key={r.id} className="py-2.5 border-b border-slate-50 last:border-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.obligation}</p>
                  {r.legal_reference && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{r.legal_reference}</p>
                  )}
                  {r.due_date && (
                    <p className="text-xs text-danger-500 font-medium mt-0.5">
                      Échéance : {new Date(r.due_date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
