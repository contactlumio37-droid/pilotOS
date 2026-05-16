import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Triggered daily at 08:00 UTC via pg_cron (scheduled in migration 20260516007)
// Calls notify_epi_habilitation_alerts() SQL function which:
// - creates in-app notifications for EPIs/habilitations expiring within 30 days
// - deduplicates by day to avoid spam

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  )

  // Trigger SQL function to create in-app notifications
  const { error: rpcError } = await supabase.rpc('notify_epi_habilitation_alerts')
  if (rpcError) {
    console.error('notify_epi_habilitation_alerts error:', rpcError.message)
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch notifications created in the last 2 hours by EPI alert types
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, organisation_id')
    .in('type', ['epi_expiry', 'habilitation_expiry'])
    .gte('created_at', since)

  if (!notifications?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Group by user_id and send one email per user
  const byUser = new Map<string, typeof notifications>()
  for (const n of notifications) {
    if (!byUser.has(n.user_id)) byUser.set(n.user_id, [])
    byUser.get(n.user_id)!.push(n)
  }

  let emailsSent = 0
  const appUrl = Deno.env.get('APP_URL') ?? 'https://pilotos.app'

  for (const [userId, userNotifs] of byUser) {
    // Check user email pref
    const { data: pref } = await supabase
      .from('notification_prefs')
      .select('email_epi_alerts')
      .eq('user_id', userId)
      .maybeSingle()

    if (!pref?.email_epi_alerts) continue

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.email) continue

    const itemList = userNotifs.map(n => `• ${n.title}`).join('\n')

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: profile.email,
        subject: `PilotOS — ${userNotifs.length} alerte(s) EPI/habilitation`,
        html: `
          <p>Bonjour ${profile.full_name ?? ''},</p>
          <p>Les éléments suivants arrivent à échéance prochainement :</p>
          <pre style="font-family:sans-serif;line-height:1.6">${itemList}</pre>
          <p><a href="${appUrl}">Accéder à PilotOS</a></p>
        `,
      }),
    })
    emailsSent++
  }

  return new Response(
    JSON.stringify({ ok: true, notifications: notifications.length, emails_sent: emailsSent }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
