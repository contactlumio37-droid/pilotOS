// Centralized event logger — writes to admin_audit_log via supabase
import { supabase } from './supabase'

export interface LogEventParams {
  action: string
  userId?: string
  organisationId?: string
  meta?: Record<string, unknown>
}

export async function logEvent({ action, userId, organisationId, meta }: LogEventParams): Promise<void> {
  try {
    await supabase.from('admin_audit_log').insert({
      action,
      actor_id:        userId ?? null,
      organisation_id: organisationId ?? null,
      metadata:        meta ?? null,
    })
  } catch (err) {
    console.error('[logger] logEvent failed:', err)
  }
}

// Dev-only console logger (no-op in production)
export const logger = {
  info:  (...args: unknown[]) => import.meta.env.DEV && console.info('[pilotOS]', ...args),
  warn:  (...args: unknown[]) => import.meta.env.DEV && console.warn('[pilotOS]', ...args),
  error: (...args: unknown[]) => console.error('[pilotOS]', ...args),
}
