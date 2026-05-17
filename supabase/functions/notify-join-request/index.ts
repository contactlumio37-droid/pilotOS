// Edge Function : notify-join-request
// Action 'created'  → envoie un email à chaque admin de l'org
// Action 'accepted' → envoie un email de confirmation au demandeur
// Action 'rejected' → envoie un email de refus au demandeur
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BRAND = '#444ce7'
const YEAR  = new Date().getFullYear()

function footer(): string {
  return `<tr><td style="padding:24px 0 0;text-align:center;color:#94a3b8;font-size:12px;">
    <p style="margin:0;">© ${YEAR} PilotOS · <a href="https://pilotos.app/confidentialite" style="color:#94a3b8;">Confidentialité</a></p>
  </td></tr>`
}

function header(): string {
  return `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="background:${BRAND};border-radius:12px 12px 0 0;padding:20px 32px;">
      <span style="font-size:18px;font-weight:700;color:#fff;">PilotOS</span>
    </td></tr>
  </table></td></tr>`
}

function wrap(inner: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
  ${header()}
  <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="background:#fff;border-radius:0 0 12px 12px;padding:32px;color:#0f172a;font-size:15px;line-height:1.6;">
      ${inner}
    </td></tr>
  </table></td></tr>
  ${footer()}
</table></td></tr>
</table></body></html>`
}

function joinRequestReceivedHtml(p: {
  adminName: string; requesterName: string; requesterEmail: string
  orgName: string; message: string | null; reviewUrl: string
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Demande d'adhésion</h1>
    <p style="margin:0 0 8px;color:#334155;">Bonjour ${p.adminName},</p>
    <p style="margin:0 0 16px;color:#334155;">
      <strong>${p.requesterName}</strong> (${p.requesterEmail}) souhaite rejoindre <strong>${p.orgName}</strong>.
    </p>
    ${p.message ? `<blockquote style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid ${BRAND};border-radius:4px;color:#334155;font-style:italic;">"${p.message}"</blockquote>` : ''}
    <a href="${p.reviewUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Gérer la demande</a>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">Vous pouvez accepter ou refuser depuis l'onglet Membres → Demandes.</p>
  `)
}

function joinRequestAcceptedHtml(p: { userName: string; orgName: string; appUrl: string }): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Bienvenue dans ${p.orgName} !</h1>
    <p style="margin:0 0 16px;color:#334155;">Bonjour ${p.userName},</p>
    <p style="margin:0 0 16px;color:#334155;">
      Votre demande d'adhésion à <strong>${p.orgName}</strong> a été acceptée. Vous pouvez maintenant accéder à votre espace.
    </p>
    <a href="${p.appUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Accéder à mon espace</a>
  `)
}

function joinRequestRejectedHtml(p: { userName: string; orgName: string; appUrl: string }): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Demande d'adhésion</h1>
    <p style="margin:0 0 16px;color:#334155;">Bonjour ${p.userName},</p>
    <p style="margin:0 0 16px;color:#334155;">
      Votre demande d'adhésion à <strong>${p.orgName}</strong> n'a pas été retenue.
    </p>
    <p style="margin:0 0 16px;color:#334155;">
      Vous pouvez créer votre propre espace gratuitement et inviter votre équipe.
    </p>
    <a href="${p.appUrl}/register" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Créer mon espace</a>
  `)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')             ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json() as { action: 'created' | 'accepted' | 'rejected'; join_request_id: string }
    const { action, join_request_id } = body

    if (!action || !join_request_id) return json({ error: 'action and join_request_id required' }, 400)

    // Fetch join request + org + requester profile
    const { data: jr, error: jrErr } = await supabase
      .from('join_requests')
      .select('*, organisation:organisations(id, name)')
      .eq('id', join_request_id)
      .single()
    if (jrErr || !jr) return json({ error: 'join_request not found' }, 404)

    const orgName  = (jr.organisation as { name: string }).name
    const appUrl   = Deno.env.get('APP_URL') ?? 'https://pilotos.app'

    // Requester info
    const { data: requesterAuth } = await supabase.auth.admin.getUserById(jr.user_id)
    const requesterEmail = requesterAuth?.user?.email ?? ''
    const { data: requesterProfile } = await supabase.from('profiles').select('full_name').eq('id', jr.user_id).maybeSingle()
    const requesterName = requesterProfile?.full_name ?? requesterEmail.split('@')[0]

    if (action === 'created') {
      // Notify all active admins of the org
      const { data: admins } = await supabase
        .from('organisation_members')
        .select('user_id')
        .eq('organisation_id', jr.organisation_id)
        .eq('role', 'admin')
        .eq('is_active', true)

      if (!admins?.length) return json({ ok: true, sent: 0 })

      let sent = 0
      await Promise.allSettled((admins).map(async (admin) => {
        const { data: adminAuth } = await supabase.auth.admin.getUserById(admin.user_id)
        const adminEmail = adminAuth?.user?.email
        if (!adminEmail) return
        const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', admin.user_id).maybeSingle()
        const adminName = adminProfile?.full_name ?? 'Admin'

        await supabase.functions.invoke('send-email', {
          body: {
            to: adminEmail,
            subject: `Demande d'adhésion — ${requesterName} → ${orgName}`,
            html: joinRequestReceivedHtml({
              adminName,
              requesterName,
              requesterEmail,
              orgName,
              message: jr.message ?? null,
              reviewUrl: `${appUrl}/admin/membres`,
            }),
            text: `${requesterName} (${requesterEmail}) souhaite rejoindre ${orgName}. Gérer : ${appUrl}/admin/membres`,
          },
        })
        sent++
      }))

      return json({ ok: true, sent })
    }

    if (action === 'accepted') {
      if (!requesterEmail) return json({ ok: true, skipped: 'no_email' })
      await supabase.functions.invoke('send-email', {
        body: {
          to: requesterEmail,
          subject: `Bienvenue dans ${orgName} !`,
          html: joinRequestAcceptedHtml({ userName: requesterName, orgName, appUrl }),
          text: `Votre demande d'adhésion à ${orgName} a été acceptée. Accéder : ${appUrl}`,
        },
      })
      return json({ ok: true })
    }

    if (action === 'rejected') {
      if (!requesterEmail) return json({ ok: true, skipped: 'no_email' })
      await supabase.functions.invoke('send-email', {
        body: {
          to: requesterEmail,
          subject: `Demande d'adhésion — ${orgName}`,
          html: joinRequestRejectedHtml({ userName: requesterName, orgName, appUrl }),
          text: `Votre demande d'adhésion à ${orgName} n'a pas été retenue.`,
        },
      })
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
