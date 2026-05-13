import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, CalendarCheck, FileText, LayoutDashboard, Shield, GraduationCap } from 'lucide-react'
import SecurityDashboard from '@/pages/security/SecurityDashboard'
import DuerPage from '@/pages/security/DuerPage'
import IncidentsPage from '@/pages/security/IncidentsPage'
import SafetyVisitsPage from '@/pages/security/SafetyVisitsPage'
import RegulatoryPage from '@/pages/security/RegulatoryPage'
import EpiPage from '@/pages/security/EpiPage'
import HabilitationsPage from '@/pages/security/HabilitationsPage'

type Tab = 'dashboard' | 'duer' | 'incidents' | 'visits' | 'regulatory' | 'epi' | 'habilitations'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',     label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'duer',          label: 'DUER',            icon: ShieldCheck },
  { id: 'incidents',     label: 'Incidents',       icon: AlertTriangle },
  { id: 'epi',           label: 'EPI',             icon: Shield },
  { id: 'habilitations', label: 'Habilitations',   icon: GraduationCap },
  { id: 'visits',        label: 'Visites',         icon: CalendarCheck },
  { id: 'regulatory',    label: 'Réglementaire',   icon: FileText },
]

export default function SecurityApp() {
  const [tab, setTab] = useState<Tab>('dashboard')

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

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === 'dashboard'     && <SecurityDashboard />}
        {tab === 'duer'          && <DuerPage />}
        {tab === 'incidents'     && <IncidentsPage />}
        {tab === 'epi'           && <EpiPage />}
        {tab === 'habilitations' && <HabilitationsPage />}
        {tab === 'visits'        && <SafetyVisitsPage />}
        {tab === 'regulatory'    && <RegulatoryPage />}
      </motion.div>
    </div>
  )
}
