import type { LucideIcon } from 'lucide-react'

export interface DashboardTab {
  id: string
  label: string
  icon: LucideIcon
  moduleGated?: boolean
}

interface DashboardTabsProps {
  tabs: DashboardTab[]
  active: string
  onChange: (id: string) => void
}

export default function DashboardTabs({ tabs, active, onChange }: DashboardTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto bg-slate-100 rounded-xl p-1 scrollbar-hide mb-6">
      {tabs.map(tab => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              active === tab.id
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}
