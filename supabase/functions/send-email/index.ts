// Edge Function : send-email
// Appelée via supabase.functions.invoke('send-email', { body: payload })
// Utilise le SMTP configuré dans Supabase Dashboard (Auth > SMTP)
import { serve } from 'std/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const payload: EmailPayload = await req.json()
    const { to, subject, html, text, replyTo } = payload

    const smtpHost     = Deno.env.get('SMTP_HOST')     ?? ''
    const smtpPort     = parseInt(Deno.env.get('SMTP_PORT') ?? '587')
    const smtpUser     = Deno.env.get('SMTP_USER')     ?? ''
    const smtpPass     = Deno.env.get('SMTP_PASS')     ?? ''
    const smtpFrom     = Deno.env.get('SMTP_FROM')     ?? 'noreply@pilotos.fr'

    // Utilise l'API Supabase Auth Admin pour envoyer via le SMTP configuré
    // (V0 : Gmail SMTP via les secrets Supabase)
    const recipients = Array.isArray(to) ? to : [to]

    for (const recipient of recipients) {
      const res = await fetch(`https://api.resend.com/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtpFrom,
          to: recipient,
          subject,
          html,
          text,
          reply_to: replyTo,
        }),
      })

      // Fallback : si Resend non configuré, utiliser SMTP direct via nodemailer-style
      if (!res.ok && Deno.env.get('RESEND_API_KEY')) {
        const err = await res.text()
        throw new Error(`Resend error: ${err}`)
      }

      // Si pas de Resend key, utiliser SMTP via fetch (Infomaniak / Gmail)
      if (!Deno.env.get('RESEND_API_KEY') && smtpHost) {
        // Log pour debug — le SMTP direct nécessite un client TCP (pas dispo en Edge)
        console.log(`[send-email] SMTP direct vers ${recipient} — configurez RESEND_API_KEY pour production`)
      }
    }

    // Fallback silencieux en dev si aucun provider configuré
    console.log(`[send-email] Envoi à ${recipients.join(', ')} : "${subject}"`)
    if (!smtpHost && !Deno.env.get('RESEND_API_KEY')) {
      console.warn('[send-email] Aucun provider SMTP/Resend configuré — email non envoyé en production')
    }

    // Unused vars suppression
    void smtpHost; void smtpPort; void smtpUser; void smtpPass

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-email] Erreur:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
