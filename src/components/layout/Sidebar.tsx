import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, LogOut, UserCircle, Building2, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { signOut, useAuth, ADMIN_SESSION_KEY } from '@/hooks/useAuth'
import { ORG_CONTEXT_KEY } from '@/hooks/useOrganisation'
import NotificationBell from './NotificationBell'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  children?: NavItem[]
}

interface SidebarProps {
  items: NavItem[]
  dark?: boolean
  profileTo?: string
  headerSlot?: (collapsed: boolean) => React.ReactNode
}

function NavGroupItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors mb-0.5 ${
          isActive
            ? 'bg-brand-600 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        } ${collapsed ? 'justify-center' : 'pl-8'}`
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
    </NavLink>
  )
}

function NavGroup({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const storageKey = `sidebar_group_${item.label}`
  const [open, setOpen] = useState(() => {
    const stored = sessionStorage.getItem(storageKey)
    return stored === null ? true : stored === 'true'
  })

  function toggle() {
    const next = !open
    setOpen(next)
    sessionStorage.setItem(storageKey, String(next))
  }

  const GroupIcon = item.icon

  if (collapsed) {
    return (
      <>
        {(item.children ?? []).map(child => (
          <NavGroupItem key={child.to} item={child} collapsed />
        ))}
      </>
    )
  }

  return (
    <div className="mb-1">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full mx-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
        style={{ width: 'calc(100% - 1rem)' }}
      >
        <div className="flex items-center gap-2">
          <GroupIcon className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">{item.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div>
          {(item.children ?? []).map(child => (
            <NavGroupItem key={child.to} item={child} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ items, dark = false, profileTo = '/profil', headerSlot }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { isImpersonating, role } = useAuth()
  const hasBannerOffset = isImpersonating || !!sessionStorage.getItem(ORG_CONTEXT_KEY) || !!localStorage.getItem(ADMIN_SESSION_KEY)

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
  const topClass = hasBannerOffset ? 'top-10' : 'top-0'
  const heightClass = hasBannerOffset ? 'h-[calc(100vh-2.5rem)]' : 'h-full'

  return (
    <aside
      className={`fixed left-0 ${topClass} ${heightClass} z-40 flex flex-col border-r transition-all duration-200 ${bg} ${width}`}
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

      {/* Header slot (ex: org switcher pour superadmin) */}
      {headerSlot && (
        <div className="border-b border-slate-800 px-2 py-2">
          {headerSlot(collapsed)}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {items.map((item) => {
          if (item.children) {
            return (
              <NavGroup
                key={item.label}
                item={item}
                collapsed={collapsed}
              />
            )
          }
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
      <div className="border-t border-slate-800 p-2 space-y-0.5">
        {/* Notifications */}
        <NotificationBell collapsed={collapsed} />

        {/* Superadmin shortcuts — bidirectional */}
        {role === 'superadmin' && window.location.pathname.startsWith('/superadmin') && (
          <button
            onClick={() => { window.location.href = '/app/dashboard' }}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-brand-400 hover:text-brand-300 hover:bg-slate-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Mon organisation' : undefined}
          >
            <Building2 className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Mon organisation</span>}
          </button>
        )}
        {role === 'superadmin' && !window.location.pathname.startsWith('/superadmin') && (
          <NavLink
            to="/superadmin"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? '⚡ Super Admin' : undefined}
          >
            <Zap className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Super Admin</span>}
          </NavLink>
        )}

        {/* Profile */}
        <NavLink
          to={profileTo}
          className={({ isActive }) =>
            `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
              isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? 'Mon profil' : undefined}
        >
          <UserCircle className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Mon profil</span>}
        </NavLink>

        {/* Logout */}
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
