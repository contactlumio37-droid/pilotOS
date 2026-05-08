import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Zap, FolderOpen, AlertCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ActivityItem {
  entity_type: 'action' | 'document' | 'terrain_report'
  entity_id: string
  organisation_id: string
  title: string
  status: string | null
  created_at: string
  user_id: string | null
  user_name: string | null
  user_avatar: string | null
}

const ENTITY_META = {
  action:         { label: 'Action',           Icon: Zap,         color: 'text-amber-500',  bg: 'bg-amber-50' },
  document:       { label: 'Document',         Icon: FolderOpen,  color: 'text-blue-500',   bg: 'bg-blue-50' },
  terrain_report: { label: 'Signalement',      Icon: AlertCircle, color: 'text-red-500',    bg: 'bg-red-50' },
} as const

export default function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { organisation } = useAuth()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['activity_feed', organisation?.id, limit],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recent_activity')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as ActivityItem[]
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Aucune activité récente</p>
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {items.map(item => {
        const meta = ENTITY_META[item.entity_type] ?? ENTITY_META.action
        const Icon = meta.Icon
        const ago = formatDistanceToNow(new Date(item.created_at), { locale: fr, addSuffix: true })

        return (
          <li key={`${item.entity_type}-${item.entity_id}`} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
            <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 truncate font-medium">{item.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.user_name ? `${item.user_name} · ` : ''}{ago}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
