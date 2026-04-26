// Edge Function : notify-late-actions
// Destinée à être appelée par un cron Supabase (pg_cron) ou un scheduler externe.
// Détecte les actions en retard, insère des notifications, envoie des emails.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  // Autoriser uniquement les appels avec le service role key (cron interne)
  const authHeader = req.headers.get('Authorization') ?? ''
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!authHeader.includes(expectedKey)) {
    return json({ error: 'Non autorisé' }, 401)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    // ── 1. Mettre à jour le statut des actions en retard ─────
    await supabaseAdmin.rpc('mark_late_actions')

    // ── 2. Récupérer les actions late avec responsable ───────
    const { data: lateActions, error: actionsError } = await supabaseAdmin
      .from('actions')
      .select(`
        id, title, due_date, organisation_id,
        responsible_id
      `)
      .eq('status', 'late')
      .not('responsible_id', 'is', null)
      .order('due_date', { ascending: true })
      .limit(500)

    if (actionsError) throw actionsError
    if (!lateActions?.length) return json({ notified: 0 })

    // ── 3. Grouper par responsable ───────────────────────────
    const byUser = new Map<string, { userId: string; orgId: string; actions: typeof lateActions }>()
    for (const action of lateActions) {
      if (!action.responsible_id) continue
      const key = `${action.responsible_id}:${action.organisation_id}`
      if (!byUser.has(key)) {
        byUser.set(key, {
          userId: action.responsible_id,
          orgId:  action.organisation_id,
          actions: [],
        })
      }
      byUser.get(key)!.actions.push(action)
    }

    // ── 4. Insérer les notifications (upsert par action + jour) ──
    let notified = 0
    const today = new Date().toISOString().slice(0, 10)

    for (const { userId, orgId, actions } of byUser.values()) {
      const count = actions.length
      const title = count === 1
        ? `Action en retard : « ${actions[0].title} »`
        : `${count} actions en retard dans votre organisation`

      // Skip si notification déjà envoyée aujourd'hui
      const { count: existing } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('organisation_id', orgId)
        .eq('type', 'late_actions')
        .gte('created_at', `${today}T00:00:00Z`)

      if (existing && existing > 0) continue

      await supabaseAdmin.from('notifications').insert({
        user_id:         userId,
        organisation_id: orgId,
        type:            'late_actions',
        title,
        body:            `Vous avez ${count} action${count > 1 ? 's' : ''} dont la date d'échéance est dépassée.`,
        action_url:      '/app/actions',
      })
      notified++
    }

    console.log(`[notify-late-actions] notified ${notified} users`)
    return json({ notified })

  } catch (err) {
    console.error('[notify-late-actions] error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
