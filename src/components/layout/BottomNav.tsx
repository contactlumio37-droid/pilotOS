import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface BottomNavProps {
  items: NavItem[]
  dark?: boolean
}

export default function BottomNav({ items, dark = false }: BottomNavProps) {
  const bg = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'

  return (
    <nav className={`bottom-nav ${bg}`}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 min-w-0 flex-1 transition-colors ${
                isActive
                  ? dark ? 'text-brand-400' : 'text-brand-600'
                  : dark ? 'text-slate-500' : 'text-slate-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate w-full text-center">
              {item.label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
