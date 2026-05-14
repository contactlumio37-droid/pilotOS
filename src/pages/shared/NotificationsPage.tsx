import { motion } from 'framer-motion'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import { useToast } from '@/components/ui/useToast'
import type { Notification } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  action_assigned:   'Action assignée',
  action_due:        'Échéance proche',
  action_done:       'Action terminée',
  nc_opened:         'NC ouverte',
  nc_closed:         'NC clôturée',
  document_pending:  'Document à valider',
  document_approved: 'Document approuvé',
  badge_earned:      'Badge débloqué',
  terrain_report:    'Signalement terrain',
  system:            'Système',
}

function NotifRow({ notif }: { notif: Notification }) {
  const navigate  = useNavigate()
  const markRead  = useMarkNotificationRead()
  const typeLabel = TYPE_LABELS[notif.type] ?? notif.type

  async function handleClick() {
    if (!notif.read) {
      try { await markRead.mutateAsync(notif.id) } catch { /* silent */ }
    }
    if (notif.action_url) navigate(notif.action_url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`card p-4 flex items-start gap-4 transition-colors ${
        notif.action_url ? 'card-hover cursor-pointer' : ''
      } ${!notif.read ? 'border-l-4 border-l-brand-500 bg-brand-50/30' : ''}`}
    >
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-slate-200' : 'bg-brand-500'}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${notif.read ? 'text-slate-600' : 'text-slate-800'}`}>
            {notif.title}
          </p>
          <span className="text-xs text-slate-400 shrink-0">
            {format(new Date(notif.created_at), 'd MMM, HH:mm', { locale: fr })}
          </span>
        </div>
        {notif.body && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.body}</p>
        )}
        <span className="inline-block mt-1.5 text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
          {typeLabel}
        </span>
      </div>

      {notif.action_url && (
        <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />
      )}
    </motion.div>
  )
}

export default function NotificationsPage() {
  const { data: notifs = [], isLoading } = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const toast   = useToast()

  const unreadCount = notifs.filter(n => !n.read).length

  async function handleMarkAll() {
    try {
      await markAll.mutateAsync()
      toast.success('Toutes les notifications marquées comme lues')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAll}
              disabled={markAll.isPending}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer comme lu
            </button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))}
        </div>
      )}

      {!isLoading && notifs.length === 0 && (
        <div className="card text-center py-14">
          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Aucune notification</p>
          <p className="text-sm text-slate-400 mt-1">
            Vous serez notifié des actions qui vous concernent, des échéances et des documents à valider.
          </p>
        </div>
      )}

      {!isLoading && notifs.length > 0 && (
        <div className="space-y-2">
          {notifs.map(n => <NotifRow key={n.id} notif={n} />)}
        </div>
      )}
    </div>
  )
}
