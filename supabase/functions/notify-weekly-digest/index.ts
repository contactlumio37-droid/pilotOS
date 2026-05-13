// Edge Function : notify-weekly-digest
// Appelée par cron pg_cron tous les lundis à 7h UTC.
// Envoie un résumé hebdomadaire aux membres ayant email_digest_weekly = true :
//   - Actions en retard dont ils sont responsables
//   - Actions dues dans les 7 prochains jours
//   - Signalements terrain en attente (pour managers+)
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function weeklyDigestHtml(
  name: string,
  orgName: string,
  lateActions: { title: string; dueDate: string }[],
  dueSoonActions: { title: string; dueDate: string }[],
  pendingReports: number,
  appUrl: string,
): string {
  const BRAND = '#444ce7'
  const year = new Date().getFullYear()

  function actionRows(actions: { title: string; dueDate: string }[], color: string) {
    return actions.map(a =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">${a.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:${color};font-size:13px;">${a.dueDate}</td>
      </tr>`,
    ).join('')
  }

  const lateSection = lateActions.length > 0 ? `
    <h2 style="margin:24px 0 8px;font-size:16px;color:#ef4444;">⚠ ${lateActions.length} action${lateActions.length > 1 ? 's' : ''} en retard</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      ${actionRows(lateActions, '#ef4444')}
    </table>` : ''

  const dueSoonSection = dueSoonActions.length > 0 ? `
    <h2 style="margin:24px 0 8px;font-size:16px;color:#f59e0b;">📅 ${dueSoonActions.length} action${dueSoonActions.length > 1 ? 's' : ''} à échéance cette semaine</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #fde68a;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      ${actionRows(dueSoonActions, '#d97706')}
    </table>` : ''

  const reportsSection = pendingReports > 0 ? `
    <p style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:14px;">
      📋 <strong>${pendingReports} signalement${pendingReports > 1 ? 's' : ''} terrain</strong> en attente de traitement.
    </p>` : ''

  const allGood = lateActions.length === 0 && dueSoonActions.length === 0 && pendingReports === 0

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
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Votre résumé de la semaine</h1>
      <p style="margin:0 0 16px;color:#64748b;font-size:14px;">${orgName}</p>
      <p style="margin:0 0 16px;color:#334155;">Bonjour ${name},</p>
      ${allGood
        ? '<p style="padding:16px;background:#f0fdf4;border-radius:8px;color:#166534;font-size:14px;">✅ Tout est à jour — aucune action en retard ni signalement en attente. Bravo !</p>'
        : lateSection + dueSoonSection + reportsSection
      }
      <a href="${appUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Ouvrir PilotOS</a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Ce résumé est envoyé chaque lundi. Vous pouvez le désactiver dans vos préférences de notification.</p>
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
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    const todayStr = today.toISOString().slice(0, 10)
    const nextWeekStr = nextWeek.toISOString().slice(0, 10)

    // Fetch all active members with digest pref enabled
    const { data: members, error: membersError } = await supabaseAdmin
      .from('organisation_members')
      .select('user_id, organisation_id, role, notification_prefs')
      .eq('is_active', true)

    if (membersError) throw membersError
    if (!members?.length) return json({ emailed: 0 })

    let emailed = 0

    for (const member of members) {
      const prefs = (member.notification_prefs as Record<string, boolean> | null) ?? {}
      if (prefs.email_digest_weekly === false) continue

      const { user_id: userId, organisation_id: orgId, role } = member

      // Late actions for this member
      const { data: lateActions } = await supabaseAdmin
        .from('actions')
        .select('title, due_date')
        .eq('organisation_id', orgId)
        .eq('responsible_id', userId)
        .eq('status', 'late')
        .order('due_date', { ascending: true })
        .limit(10)

      // Due-soon actions (next 7 days)
      const { data: dueSoonActions } = await supabaseAdmin
        .from('actions')
        .select('title, due_date')
        .eq('organisation_id', orgId)
        .eq('responsible_id', userId)
        .in('status', ['todo', 'in_progress'])
        .gte('due_date', todayStr)
        .lte('due_date', nextWeekStr)
        .order('due_date', { ascending: true })
        .limit(10)

      // Pending terrain reports (manager+ only)
      let pendingReports = 0
      const managerRoles = ['manager', 'director', 'admin', 'superadmin']
      if (managerRoles.includes(role)) {
        const { count } = await supabaseAdmin
          .from('terrain_reports')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', orgId)
          .eq('status', 'pending')
        pendingReports = count ?? 0
      }

      // Skip if nothing to report
      if (!lateActions?.length && !dueSoonActions?.length && pendingReports === 0) continue

      // Get user email and name
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const email = userData?.user?.email
      const name = userData?.user?.user_metadata?.full_name ?? 'vous'
      if (!email) continue

      const { data: org } = await supabaseAdmin
        .from('organisations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()

      const formattedLate = (lateActions ?? []).map(a => ({
        title: a.title,
        dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '',
      }))

      const formattedDueSoon = (dueSoonActions ?? []).map(a => ({
        title: a.title,
        dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '',
      }))

      const totalItems = formattedLate.length + formattedDueSoon.length + pendingReports
      const subject = totalItems === 0
        ? `Résumé hebdomadaire — ${org?.name ?? 'votre organisation'}`
        : `${totalItems} point${totalItems > 1 ? 's' : ''} à traiter — ${org?.name ?? 'votre organisation'}`

      const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: email,
          subject,
          html: weeklyDigestHtml(
            name,
            org?.name ?? 'votre organisation',
            formattedLate,
            formattedDueSoon,
            pendingReports,
            `${APP_URL}/app/actions`,
          ),
          text: `Résumé hebdomadaire PilotOS — ${formattedLate.length} action(s) en retard, ${formattedDueSoon.length} à échéance cette semaine. Accéder : ${APP_URL}/app/actions`,
        },
      })

      if (!emailError) emailed++
    }

    console.log(`[notify-weekly-digest] emailed=${emailed}`)
    return json({ emailed })

  } catch (err) {
    console.error('[notify-weekly-digest] error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
