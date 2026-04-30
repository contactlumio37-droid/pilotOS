import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import type { Notification } from '@/types/database'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'À l\'instant'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} j`
}

function NotifRow({ notif, onRead, onNavigate }: { notif: Notification; onRead: (id: string) => void; onNavigate: () => void }) {
  const navigate = useNavigate()

  function handleClick() {
    if (!notif.read) onRead(notif.id)
    if (notif.type === 'feedback_reply' && notif.action_url) {
      onNavigate()
      navigate(notif.action_url)
    }
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer transition-colors ${
        !notif.read ? 'bg-slate-800/60' : ''
      }`}
      onClick={handleClick}
    >
      {!notif.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
      {notif.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-transparent shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${notif.read ? 'text-slate-400' : 'text-slate-100'}`}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.body}</p>
        )}
        <p className="text-xs text-slate-500 mt-0.5">{timeAgo(notif.created_at)}</p>
      </div>
    </div>
  )
}

export default function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? 'Notifications' : undefined}
      >
        <div className="relative shrink-0">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        {!collapsed && <span className="text-sm">Notifications</span>}
        {!collapsed && unread > 0 && (
          <span className="ml-auto badge bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotifRow key={n.id} notif={n} onRead={id => markRead.mutate(id)} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>

          {notifications.length > 0 && unread === 0 && (
            <div className="px-4 py-2 border-t border-slate-700 flex items-center gap-1.5 text-xs text-slate-500">
              <Check className="w-3.5 h-3.5" />
              Tout est lu
            </div>
          )}
        </div>
      )}
    </div>
  )
}
