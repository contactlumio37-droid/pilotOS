// Edge Function : notify-document-approval
// Appelée depuis le frontend (useUpdateDocument) quand un document passe en statut 'in_review'.
// Notifie le reviewer et l'approver désignés sur le document.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function approvalRequestHtml(name: string, docTitle: string, orgName: string, appUrl: string): string {
  const BRAND = '#444ce7'
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
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Document en attente de validation</h1>
      <p style="margin:0 0 16px;color:#334155;">Bonjour ${name},</p>
      <p style="margin:0 0 16px;color:#334155;">Le document <strong>${docTitle}</strong> dans <strong>${orgName}</strong> est en attente de votre validation.</p>
      <a href="${appUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Voir le document</a>
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

  const APP_URL = Deno.env.get('APP_URL') ?? 'https://pilotos.app'

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    // Verify caller is an authenticated user
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authErr || !caller) return json({ error: 'Non authentifié' }, 401)

    const { document_id } = await req.json() as { document_id: string }
    if (!document_id) return json({ error: 'document_id requis' }, 400)

    const { data: doc, error: docErr } = await admin
      .from('documents')
      .select('id, title, organisation_id, reviewer_id, approver_id')
      .eq('id', document_id)
      .single()

    if (docErr || !doc) return json({ error: 'Document introuvable' }, 404)

    // Verify caller belongs to the document's organisation
    const { data: membership } = await admin
      .from('organisation_members')
      .select('role')
      .eq('user_id', caller.id)
      .eq('organisation_id', doc.organisation_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!membership) return json({ error: 'Accès refusé' }, 403)

    const { data: org } = await admin
      .from('organisations')
      .select('name')
      .eq('id', doc.organisation_id)
      .maybeSingle()

    const orgName = org?.name ?? 'votre organisation'
    const docUrl  = `${APP_URL}/app/ged`

    // Notify reviewer and approver (deduplicated if same person)
    const targetIds = [...new Set([doc.reviewer_id, doc.approver_id].filter(Boolean) as string[])]
    let notified = 0
    let emailed = 0

    for (const userId of targetIds) {
      // In-app notification
      await admin.from('notifications').insert({
        user_id:         userId,
        organisation_id: doc.organisation_id,
        type:            'document_approval',
        title:           `Document à valider : « ${doc.title} »`,
        body:            `Le document "${doc.title}" est en attente de votre validation.`,
        action_url:      '/app/ged',
      })
      notified++

      // Email preference check
      const { data: memberRow } = await admin
        .from('organisation_members')
        .select('notification_prefs')
        .eq('user_id', userId)
        .eq('organisation_id', doc.organisation_id)
        .eq('is_active', true)
        .maybeSingle()

      const prefs = (memberRow?.notification_prefs as Record<string, boolean> | null) ?? {}
      if (prefs.email_document_approval === false) continue

      const { data: userData } = await admin.auth.admin.getUserById(userId)
      const email = userData?.user?.email
      const name  = userData?.user?.user_metadata?.full_name ?? 'vous'
      if (!email) continue

      const { error: emailErr } = await admin.functions.invoke('send-email', {
        body: {
          to:      email,
          subject: `Document à valider : « ${doc.title} » — ${orgName}`,
          html:    approvalRequestHtml(name, doc.title, orgName, docUrl),
          text:    `Le document "${doc.title}" attend votre validation. Accéder : ${docUrl}`,
        },
      })

      if (!emailErr) emailed++
    }

    console.log(`[notify-document-approval] doc=${document_id} notified=${notified} emailed=${emailed}`)
    return json({ notified, emailed })

  } catch (err) {
    console.error('[notify-document-approval] error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
