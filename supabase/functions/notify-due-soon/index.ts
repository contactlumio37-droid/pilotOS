// Edge Function : notify-due-soon
// Appelée par pg_cron tous les jours à 08:00 UTC.
// Trouve les actions dont l'échéance est dans exactement 2 jours,
// insère une notification in-app et envoie un email si email_due_soon = true.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function dueSoonHtml(name: string, orgName: string, actions: { title: string; dueDate: string }[], appUrl: string): string {
  const BRAND = '#444ce7'
  const rows = actions.map(a =>
    `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${a.title}</td>
     <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:#f59e0b;font-size:13px;">${a.dueDate}</td></tr>`,
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
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Échéance dans 2 jours</h1>
      <p style="margin:0 0 16px;color:#334155;">Bonjour ${name},</p>
      <p style="margin:0 0 16px;color:#334155;">Vous avez ${n} action${n > 1 ? 's' : ''} dont l'échéance approche dans <strong>${orgName}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0 24px;">${rows}</table>
      <a href="${appUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Voir mes actions</a>
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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const APP_URL = Deno.env.get('APP_URL') ?? 'https://pilotos.app'

  try {
    const today = new Date()
    const target = new Date(today)
    target.setDate(today.getDate() + 2)
    const targetDate = target.toISOString().slice(0, 10)
    const todayDate  = today.toISOString().slice(0, 10)

    const { data: actions, error: actionsErr } = await admin
      .from('actions')
      .select('id, title, due_date, organisation_id, responsible_id')
      .eq('due_date', targetDate)
      .not('status', 'in', '("done","cancelled")')
      .not('responsible_id', 'is', null)
      .limit(500)

    if (actionsErr) throw actionsErr
    if (!actions?.length) return json({ notified: 0, emailed: 0 })

    // Group by user
    const byUser = new Map<string, { userId: string; orgId: string; actions: typeof actions }>()
    for (const action of actions) {
      if (!action.responsible_id) continue
      const key = `${action.responsible_id}:${action.organisation_id}`
      if (!byUser.has(key)) byUser.set(key, { userId: action.responsible_id, orgId: action.organisation_id, actions: [] })
      byUser.get(key)!.actions.push(action)
    }

    let notified = 0
    let emailed = 0

    for (const { userId, orgId, actions: userActions } of byUser.values()) {
      const n = userActions.length
      const title = n === 1
        ? `Échéance dans 2 jours : « ${userActions[0].title} »`
        : `${n} actions arrivent à échéance dans 2 jours`

      // In-app notification (dedup par jour)
      const { count: existing } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('organisation_id', orgId)
        .eq('type', 'due_soon')
        .gte('created_at', `${todayDate}T00:00:00Z`)

      if (!existing || existing === 0) {
        await admin.from('notifications').insert({
          user_id: userId, organisation_id: orgId,
          type: 'due_soon', title,
          body: `Vous avez ${n} action${n > 1 ? 's' : ''} dont l'échéance est dans 2 jours.`,
          action_url: '/app/actions',
        })
        notified++
      }

      // Email preference check
      const { data: memberRow } = await admin
        .from('organisation_members')
        .select('notification_prefs')
        .eq('user_id', userId)
        .eq('organisation_id', orgId)
        .eq('is_active', true)
        .maybeSingle()

      const prefs = (memberRow?.notification_prefs as Record<string, boolean> | null) ?? {}
      if (prefs.email_due_soon === false) continue

      const { data: userData } = await admin.auth.admin.getUserById(userId)
      const email = userData?.user?.email
      const name  = userData?.user?.user_metadata?.full_name ?? 'vous'
      if (!email) continue

      const { data: org } = await admin
        .from('organisations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()

      const actionList = userActions.slice(0, 10).map(a => ({
        title: a.title,
        dueDate: a.due_date ?? '',
      }))

      const { error: emailErr } = await admin.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `Échéance dans 2 jours — ${org?.name ?? 'votre organisation'}`,
          html: dueSoonHtml(name, org?.name ?? 'votre organisation', actionList, `${APP_URL}/app/actions`),
          text: `Vous avez ${n} action${n > 1 ? 's' : ''} dont l'échéance est dans 2 jours. Accéder : ${APP_URL}/app/actions`,
        },
      })

      if (!emailErr) emailed++
    }

    console.log(`[notify-due-soon] notified=${notified} emailed=${emailed}`)
    return json({ notified, emailed })

  } catch (err) {
    console.error('[notify-due-soon] error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
