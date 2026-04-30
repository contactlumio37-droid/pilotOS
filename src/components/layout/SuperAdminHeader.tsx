import type { CSSProperties } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/hooks/useAuth'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import NotificationBell from './NotificationBell'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface SuperAdminHeaderProps {
  items: NavItem[]
  profileTo?: string
}

export const SUPERADMIN_HEADER_HEIGHT = 56

export default function SuperAdminHeader({ items, profileTo = '/superadmin/profil' }: SuperAdminHeaderProps) {
  const breakpoint = useBreakpoint()
  const isDesktop = breakpoint === 'desktop'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 bg-slate-950 border-b border-slate-800 flex items-center"
      style={{ height: SUPERADMIN_HEADER_HEIGHT }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 shrink-0 border-r border-slate-800 h-full">
        <div className="w-7 h-7 rounded-lg bg-brand-600 shrink-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        {isDesktop && (
          <span className="text-white font-display font-bold text-base">PilotOS</span>
        )}
      </div>

      {/* Nav — horizontally scrollable, no visible scrollbar */}
      <nav
        className="flex-1 flex items-center gap-0.5 px-2 overflow-x-auto h-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
      >
        {items.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={!isDesktop ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-medium shrink-0 ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isDesktop && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-0.5 px-2 shrink-0 border-l border-slate-800 h-full">
        <NotificationBell collapsed={!isDesktop} />

        <NavLink
          to={profileTo}
          title={!isDesktop ? 'Mon profil' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors text-sm ${
              isActive ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`
          }
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          {isDesktop && <span>Profil</span>}
        </NavLink>

        <button
          onClick={() => signOut()}
          title={!isDesktop ? 'Déconnexion' : undefined}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isDesktop && <span>Déconnexion</span>}
        </button>
      </div>
    </header>
  )
}
