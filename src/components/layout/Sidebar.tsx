import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut } from '@/hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface SidebarProps {
  items: NavItem[]
  dark?: boolean
}

export default function Sidebar({ items, dark = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Sync main content margin via CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-current-width', '210px')
    return () => { document.documentElement.style.removeProperty('--sidebar-current-width') }
  }, [])

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    document.documentElement.style.setProperty('--sidebar-current-width', next ? '52px' : '210px')
  }

  const bg = dark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'
  const width = collapsed ? 'w-[52px]' : 'w-[210px]'

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r transition-all duration-200 ${bg} ${width}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-7 h-7 rounded-lg bg-brand-600 shrink-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        {!collapsed && (
          <span className="text-white font-display font-bold text-lg">PilotOS</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-2">
        <button
          onClick={() => signOut()}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Déconnexion</span>}
        </button>

        <button
          onClick={handleToggle}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-600 hover:text-slate-400 transition-colors mt-1 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
