// Edge Function : invite-member
// Utilise la service_role key (côté serveur uniquement)
// Génère un lien d'invitation Supabase Auth + envoie l'email
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitePayload {
  email: string
  role: string
  organisationId: string
  orgName: string
  inviterName: string
  redirectTo: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Service role requis pour générer un lien d'invitation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const payload: InvitePayload = await req.json()
    const { email, role, organisationId, orgName, inviterName, redirectTo } = payload

    // 1. Générer lien d'invitation (crée le user si inexistant)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo },
    })
    if (linkError) throw linkError

    const userId = linkData.user.id
    const inviteUrl = linkData.properties.action_link

    // 2. Créer/mettre à jour le membre dans l'organisation
    const { error: memberError } = await supabaseAdmin
      .from('organisation_members')
      .upsert({
        organisation_id: organisationId,
        user_id: userId,
        role,
        invited_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: 'organisation_id,user_id' })
    if (memberError) throw memberError

    // 3. Envoyer l'email d'invitation via send-email
    const emailBody = {
      to: email,
      subject: `${inviterName} vous invite sur PilotOS — ${orgName}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: #444ce7; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
            <span style="color: white; font-weight: bold; font-size: 20px;">P</span>
          </div>
          <h2 style="color: #0F172A; margin-bottom: 8px;">Vous avez été invité sur PilotOS</h2>
          <p style="color: #475569;"><strong>${inviterName}</strong> vous invite à rejoindre l'organisation <strong>${orgName}</strong>.</p>
          <a href="${inviteUrl}" style="
            display: inline-block;
            background: #444ce7;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
          ">Rejoindre ${orgName}</a>
          <p style="color: #94a3b8; font-size: 13px;">Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
        </div>
      `,
      text: `${inviterName} vous invite à rejoindre ${orgName} sur PilotOS.\n\nLien d'accès : ${inviteUrl}\n\nCe lien expire dans 7 jours.`,
    }

    // Appel interne à send-email
    await supabaseAdmin.functions.invoke('send-email', { body: emailBody })

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[invite-member] Erreur:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
