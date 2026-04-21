// Edge Function : impersonate-user
// Émet un JWT court (1h) permettant d'agir en tant qu'un autre utilisateur.
// Écrit dans impersonation_logs (audit immuable).
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JWT_SECRET    = Deno.env.get('IMPERSONATION_JWT_SECRET') ?? Deno.env.get('SUPABASE_JWT_SECRET') ?? ''
const TTL_SECONDS   = 60 * 60 // 1h — volontairement court

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 1. Identifier l'impersonateur
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user: impersonator }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !impersonator) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { target_user_id, organisation_id, reason } = await req.json()
    if (!target_user_id || !organisation_id) {
      return new Response(JSON.stringify({ error: 'target_user_id et organisation_id requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 2. Vérifier que l'impersonateur a can_impersonate sur cette org
    const { data: impersonatorMembership } = await supabaseAdmin
      .from('organisation_members')
      .select('role, can_impersonate')
      .eq('user_id', impersonator.id)
      .eq('organisation_id', organisation_id)
      .eq('is_active', true)
      .single()

    if (!impersonatorMembership?.can_impersonate) {
      return new Response(JSON.stringify({ error: 'Permission d\'impersonation refusée' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 3. Vérifier la cible — ne peut pas impersoner un superadmin
    const { data: targetMembership } = await supabaseAdmin
      .from('organisation_members')
      .select('role, is_billable')
      .eq('user_id', target_user_id)
      .eq('organisation_id', organisation_id)
      .eq('is_active', true)
      .single()

    if (!targetMembership) {
      return new Response(JSON.stringify({ error: 'Utilisateur cible introuvable dans cette organisation' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (targetMembership.role === 'superadmin') {
      return new Response(JSON.stringify({ error: 'Impossible d\'impersoner un superadmin' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 4. Écriture audit log (avant d'émettre le token)
    const { data: logRow, error: logError } = await supabaseAdmin
      .from('impersonation_logs')
      .insert({
        impersonator_id:      impersonator.id,
        impersonated_user_id: target_user_id,
        organisation_id,
        reason:               reason ?? null,
        ip_address:           req.headers.get('x-forwarded-for') ?? null,
        user_agent:           req.headers.get('user-agent') ?? null,
      })
      .select('id')
      .single()

    if (logError) throw logError

    // 5. Émettre le JWT d'impersonation (court, signé séparément)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    )

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub:              target_user_id,
        org_id:           organisation_id,
        role:             targetMembership.role,
        is_billable:      targetMembership.is_billable,
        is_impersonating: true,
        impersonator_id:  impersonator.id,
        session_id:       logRow.id,   // lié à la ligne d'audit
        iat:              getNumericDate(0),
        exp:              getNumericDate(TTL_SECONDS),
      },
      key,
    )

    return new Response(JSON.stringify({ token, session_id: logRow.id, expires_in: TTL_SECONDS }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[impersonate-user]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
