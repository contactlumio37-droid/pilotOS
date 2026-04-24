// Edge Function : impersonate-user
// Émet un JWT Supabase-compatible permettant d'agir en tant qu'un autre utilisateur.
// Utilise SUPABASE_JWT_SECRET → setSession() côté client fonctionne nativement.
// Écrit dans impersonation_logs (audit immuable) AVANT d'émettre le token.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TTL_SECONDS = 60 * 60 // 1h — court par design

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 1. Identifier l'impersonateur via son Bearer token
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

    // 2. Autoriser si superadmin global OU can_impersonate dans l'org
    const [{ data: superadminRow }, { data: orgMembership }] = await Promise.all([
      supabaseAdmin
        .from('organisation_members')
        .select('id')
        .eq('user_id', impersonator.id)
        .eq('role', 'superadmin')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('organisation_members')
        .select('can_impersonate')
        .eq('user_id', impersonator.id)
        .eq('organisation_id', organisation_id)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    const canImpersonate = !!superadminRow || orgMembership?.can_impersonate === true
    if (!canImpersonate) {
      return new Response(JSON.stringify({ error: 'Permission d\'impersonation refusée' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 3. Vérifier la cible — pas de superadmin, pas de self-impersonation
    const { data: targetMembership } = await supabaseAdmin
      .from('organisation_members')
      .select('role, is_billable')
      .eq('user_id', target_user_id)
      .eq('organisation_id', organisation_id)
      .eq('is_active', true)
      .single()

    if (!targetMembership) {
      return new Response(JSON.stringify({ error: 'Cible introuvable dans cette organisation' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (targetMembership.role === 'superadmin') {
      return new Response(JSON.stringify({ error: 'Impossible d\'impersoner un superadmin' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (target_user_id === impersonator.id) {
      return new Response(JSON.stringify({ error: 'Auto-impersonation interdite' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 4. Récupérer l'email de la cible (nécessaire pour JWT Supabase-compatible)
    const { data: { user: targetAuthUser } } = await supabaseAdmin.auth.admin.getUserById(target_user_id)
    if (!targetAuthUser) {
      return new Response(JSON.stringify({ error: 'Utilisateur cible introuvable dans auth.users' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 5. Écriture audit log AVANT d'émettre le token (immuable)
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

    // 6. Émettre un JWT compatible Supabase (signé avec SUPABASE_JWT_SECRET)
    //    Claims standards requis : aud, role: "authenticated"
    //    Claims custom : is_impersonating, impersonator_id, session_id
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET') ?? ''
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    )

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        aud:              'authenticated',
        sub:              target_user_id,
        email:            targetAuthUser.email ?? '',
        role:             'authenticated',       // rôle Supabase (pas le rôle métier)
        is_impersonating: true,
        impersonator_id:  impersonator.id,
        impersonator_email: impersonator.email ?? '',
        session_id:       logRow.id,
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
