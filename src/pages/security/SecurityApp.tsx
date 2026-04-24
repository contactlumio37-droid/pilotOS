import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, CalendarCheck, FileText, LayoutDashboard } from 'lucide-react'
import SecurityDashboard from './SecurityDashboard'
import DuerPage from './DuerPage'
import IncidentsPage from './IncidentsPage'
import SafetyVisitsPage from './SafetyVisitsPage'
import RegulatoryPage from './RegulatoryPage'

type Tab = 'dashboard' | 'duer' | 'incidents' | 'visits' | 'regulatory'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'duer',       label: 'DUER',            icon: ShieldCheck },
  { id: 'incidents',  label: 'Incidents',       icon: AlertTriangle },
  { id: 'visits',     label: 'Visites',         icon: CalendarCheck },
  { id: 'regulatory', label: 'Réglementaire',   icon: FileText },
]

export default function SecurityApp() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const active = TABS.find(t => t.id === tab)!

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto bg-slate-100 rounded-xl p-1 scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
          <active.icon className="w-5 h-5 text-brand-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{active.label}</h1>
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === 'dashboard'  && <SecurityDashboard />}
        {tab === 'duer'       && <DuerPage />}
        {tab === 'incidents'  && <IncidentsPage />}
        {tab === 'visits'     && <SafetyVisitsPage />}
        {tab === 'regulatory' && <RegulatoryPage />}
      </motion.div>
    </div>
  )
}
