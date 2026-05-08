// Edge Function : notify-late-actions
// Appelée par cron pg_cron tous les jours à 8h UTC.
// 1. Marque les actions late via mark_late_actions()
// 2. Groupe par responsable + organisation
// 3. Insère une notification in-app (dedup par jour)
// 4. Envoie un email si email_late_actions = true dans notification_prefs
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Minimal branded template inlined — les Edge Functions ne partagent pas le code frontend.
function lateReminderHtml(name: string, orgName: string, actions: { title: string; dueDate: string }[], appUrl: string): string {
  const BRAND = '#444ce7'
  const rows = actions.map(a =>
    `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${a.title}</td>
     <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:#ef4444;font-size:13px;">Échu le ${a.dueDate}</td></tr>`,
  ).join('')
  const n = actions.length
  const year = new Date().getFullYear()
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
  <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="background:${BRAND};border-radius:12px 12px 0 0;padding:20px 32px;">
      <span style="font-size:18px;font-weight:700;color:#fff;">PilotOS</span>
    </td></tr>
  </table></td></tr>
  <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="background:#fff;border-radius:0 0 12px 12px;padding:32px;color:#0f172a;font-size:15px;line-height:1.6;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">${n} action${n > 1 ? 's' : ''} en retard</h1>
      <p style="margin:0 0 16px;color:#334155;">Bonjour ${name},</p>
      <p style="margin:0 0 16px;color:#334155;">Vous avez ${n} action${n > 1 ? 's' : ''} en retard dans <strong>${orgName}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0 24px;">${rows}</table>
      <a href="${appUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Voir mes actions</a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Ce rappel est envoyé quotidiennement tant que des actions restent en retard.</p>
    </td></tr>
  </table></td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;color:#94a3b8;font-size:12px;">
    <p style="margin:0;">© ${year} PilotOS · <a href="https://pilotos.app/confidentialite" style="color:#94a3b8;">Confidentialité</a></p>
  </td></tr>
</table></td></tr>
</table></body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  const authHeader = req.headers.get('Authorization') ?? ''
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!authHeader.includes(expectedKey)) return json({ error: 'Non autorisé' }, 401)

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const APP_URL = Deno.env.get('APP_URL') ?? 'https://pilotos.app'

  try {
    // 1. Mettre à jour les statuts
    await supabaseAdmin.rpc('mark_late_actions')

    // 2. Récupérer les actions late avec responsable
    const { data: lateActions, error: actionsError } = await supabaseAdmin
      .from('actions')
      .select('id, title, due_date, organisation_id, responsible_id')
      .eq('status', 'late')
      .not('responsible_id', 'is', null)
      .order('due_date', { ascending: true })
      .limit(500)

    if (actionsError) throw actionsError
    if (!lateActions?.length) return json({ notified: 0, emailed: 0 })

    // 3. Grouper par responsable
    const byUser = new Map<string, { userId: string; orgId: string; actions: typeof lateActions }>()
    for (const action of lateActions) {
      if (!action.responsible_id) continue
      const key = `${action.responsible_id}:${action.organisation_id}`
      if (!byUser.has(key)) byUser.set(key, { userId: action.responsible_id, orgId: action.organisation_id, actions: [] })
      byUser.get(key)!.actions.push(action)
    }

    let notified = 0
    let emailed = 0
    const today = new Date().toISOString().slice(0, 10)

    for (const { userId, orgId, actions } of byUser.values()) {
      const n = actions.length
      const title = n === 1 ? `Action en retard : « ${actions[0].title} »` : `${n} actions en retard dans votre organisation`

      // 4. Notification in-app (dedup quotidien)
      const { count: existing } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('organisation_id', orgId)
        .eq('type', 'late_actions')
        .gte('created_at', `${today}T00:00:00Z`)

      if (!existing || existing === 0) {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId, organisation_id: orgId,
          type: 'late_actions', title,
          body: `Vous avez ${n} action${n > 1 ? 's' : ''} dont la date d'échéance est dépassée.`,
          action_url: '/app/actions',
        })
        notified++
      }

      // 5. Email si préférence activée
      const { data: memberRow } = await supabaseAdmin
        .from('organisation_members')
        .select('notification_prefs')
        .eq('user_id', userId)
        .eq('organisation_id', orgId)
        .eq('is_active', true)
        .maybeSingle()

      const prefs = (memberRow?.notification_prefs as Record<string, boolean> | null) ?? {}
      if (prefs.email_late_actions === false) continue

      // Récupérer l'email via auth.users (service_role requis)
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const email = userData?.user?.email
      const name = userData?.user?.user_metadata?.full_name ?? 'vous'
      if (!email) continue

      // Récupérer le nom de l'organisation
      const { data: org } = await supabaseAdmin
        .from('organisations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()

      const actionList = actions.slice(0, 10).map(a => ({
        title: a.title,
        dueDate: a.due_date ?? '',
      }))

      const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `${n} action${n > 1 ? 's' : ''} en retard — ${org?.name ?? 'votre organisation'}`,
          html: lateReminderHtml(name, org?.name ?? 'votre organisation', actionList, `${APP_URL}/app/actions`),
          text: `Vous avez ${n} action${n > 1 ? 's' : ''} en retard. Accéder : ${APP_URL}/app/actions`,
        },
      })

      if (!emailError) emailed++
    }

    console.log(`[notify-late-actions] notified=${notified} emailed=${emailed}`)
    return json({ notified, emailed })

  } catch (err) {
    console.error('[notify-late-actions] error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
