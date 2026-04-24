import { useState, useEffect } from 'react'
import { AlertTriangle, UserX, Clock } from 'lucide-react'
import { useAuth, stopImpersonation } from '@/hooks/useAuth'

function useCountdown(expiresAt: Date | null): string {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = Math.max(0, expiresAt.getTime() - Date.now())
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${m}:${String(s).padStart(2, '0')}`)
      if (diff === 0) stopImpersonation()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return remaining
}

export default function ImpersonationBanner() {
  const { isImpersonating, profile, impersonatorEmail, impersonationExpiresAt } = useAuth()
  const [stopping, setStopping] = useState(false)
  const countdown = useCountdown(isImpersonating ? impersonationExpiresAt : null)

  if (!isImpersonating) return null

  async function handleStop() {
    setStopping(true)
    await stopImpersonation()
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-between text-sm shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-semibold whitespace-nowrap">Mode impersonation</span>
        <span className="opacity-50 hidden sm:block">—</span>
        <span className="font-medium truncate hidden sm:block">
          {profile?.full_name ?? 'Utilisateur'}
        </span>
        {impersonatorEmail && (
          <span className="text-xs opacity-60 hidden md:block truncate">
            (par {impersonatorEmail})
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        {countdown && (
          <div className="flex items-center gap-1 text-xs opacity-70 font-mono">
            <Clock className="w-3 h-3" />
            {countdown}
          </div>
        )}
        <button
          onClick={handleStop}
          disabled={stopping}
          className="flex items-center gap-1.5 font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 whitespace-nowrap"
        >
          <UserX className="w-4 h-4" />
          {stopping ? 'Restauration…' : 'Quitter'}
        </button>
      </div>
    </div>
  )
}
