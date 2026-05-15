import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pilotos.app'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PilotOS <newsletter@pilotos.app>',
      to,
      subject,
      html,
    }),
  })
  return res.ok
}

function buildHtml(blocks: Record<string, unknown>[], unsubToken: string): string {
  const unsubUrl = `${APP_URL}/unsubscribe?token=${unsubToken}`
  const blockHtml = blocks.map(b => {
    const type = b.type as string
    const c = (b.config ?? {}) as Record<string, unknown>
    switch (type) {
      case 'paragraph':
        return `<p style="color:#374151;line-height:1.7;margin:0 0 16px">${c.content ?? ''}</p>`
      case 'heading':
        return `<h2 style="font-size:22px;font-weight:700;color:#1e293b;margin:24px 0 12px">${c.content ?? ''}</h2>`
      case 'image':
        return c.url ? `<img src="${c.url}" alt="${c.alt ?? ''}" style="max-width:100%;border-radius:8px;margin:16px 0">` : ''
      case 'button':
        return `<div style="text-align:${c.align ?? 'center'};margin:24px 0"><a href="${c.url ?? '#'}" style="display:inline-block;background:#444ce7;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">${c.label ?? 'Voir'}</a></div>`
      case 'divider':
        return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">`
      default:
        return ''
    }
  }).join('\n')

  return `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
      <div style="background:#444ce7;padding:24px;text-align:center">
        <span style="color:#fff;font-size:20px;font-weight:700">PilotOS</span>
      </div>
      <div style="padding:32px">${blockHtml}</div>
      <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
        <a href="${unsubUrl}" style="font-size:12px;color:#94a3b8;text-decoration:underline">Se désabonner</a>
      </div>
    </div>
  </body></html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify superadmin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Non authentifié')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) throw new Error('Non authentifié')
    const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', user.id).single()
    if (!profile?.is_superadmin) throw new Error('Accès refusé')

    const { campaign_id } = await req.json() as { campaign_id: string }
    if (!campaign_id) throw new Error('campaign_id requis')

    // Load campaign
    const { data: campaign, error: campErr } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single()
    if (campErr || !campaign) throw new Error('Campagne introuvable')
    if (campaign.status === 'sent') throw new Error('Campagne déjà envoyée')

    // Load confirmed, active subscribers
    const { data: subscribers } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, confirm_token')
      .eq('confirmed', true)
      .is('unsubscribed_at', null)

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, failed: 0, message: 'Aucun abonné confirmé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let sent = 0
    let failed = 0

    for (const sub of subscribers) {
      const html = buildHtml(
        (campaign.content_blocks ?? []) as Record<string, unknown>[],
        sub.confirm_token ?? sub.id,
      )
      const ok = await sendEmail(sub.email, campaign.subject, html)
      if (ok) sent++ ; else failed++
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100))
    }

    // Update campaign status
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
        recipient_count: subscribers.length,
      })
      .eq('id', campaign_id)

    return new Response(
      JSON.stringify({ ok: true, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
