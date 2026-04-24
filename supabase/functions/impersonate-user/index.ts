// Edge Function : impersonate-user
// Émet un JWT Supabase-compatible (aud: "authenticated", signé avec le secret JWT du projet).
// Audit log écrit AVANT l'émission du token — immuable même en cas d'erreur réseau.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Priorité : SUPABASE_LEGACY_JWT_SECRET (projets anciens) → SUPABASE_JWT_SECRET
const JWT_SECRET =
  Deno.env.get('SUPABASE_LEGACY_JWT_SECRET') ??
  Deno.env.get('SUPABASE_JWT_SECRET') ??
  ''

const TTL_SECONDS = 60 * 60 // 1 heure

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    if (!JWT_SECRET) {
      console.error('[impersonate-user] JWT secret manquant — configurer SUPABASE_LEGACY_JWT_SECRET ou SUPABASE_JWT_SECRET')
      return json({ error: 'Configuration serveur invalide' }, 500)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // ── 1. Identifier l'impersonateur via son Bearer token ────
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user: impersonator }, error: authError } =
      await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !impersonator) {
      return json({ error: 'Non authentifié' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const { target_user_id, organisation_id, reason } = body as {
      target_user_id?: string
      organisation_id?: string
      reason?: string
    }

    if (!target_user_id || !organisation_id) {
      return json({ error: 'target_user_id et organisation_id requis' }, 400)
    }

    if (target_user_id === impersonator.id) {
      return json({ error: 'Auto-impersonation interdite' }, 400)
    }

    // ── 2. Autoriser si superadmin global OU can_impersonate dans l'org ──
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

    if (!superadminRow && !orgMembership?.can_impersonate) {
      return json({ error: "Permission d'impersonation refusée" }, 403)
    }

    // ── 3. Vérifier la cible — pas de superadmin ─────────────
    const { data: targetMembership, error: targetError } = await supabaseAdmin
      .from('organisation_members')
      .select('role')
      .eq('user_id', target_user_id)
      .eq('organisation_id', organisation_id)
      .eq('is_active', true)
      .maybeSingle()

    if (targetError || !targetMembership) {
      return json({ error: "Cible introuvable dans cette organisation" }, 404)
    }
    if (targetMembership.role === 'superadmin') {
      return json({ error: "Impossible d'impersoner un superadmin" }, 403)
    }

    // ── 4. Récupérer l'email de la cible (claims JWT) ─────────
    const { data: { user: targetAuthUser } } =
      await supabaseAdmin.auth.admin.getUserById(target_user_id)

    if (!targetAuthUser) {
      return json({ error: "Utilisateur cible introuvable dans auth.users" }, 404)
    }

    // ── 5. Audit log AVANT l'émission — immuable ─────────────
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

    if (logError) {
      console.error('[impersonate-user] audit log failed:', logError)
      throw logError
    }

    // ── 6. Émettre JWT Supabase-compatible ───────────────────
    // Claims requis pour PostgREST/RLS : aud, sub, role: "authenticated"
    // Claims custom : is_impersonating, impersonator_id, session_id
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
        aud:                'authenticated',
        sub:                target_user_id,
        email:              targetAuthUser.email ?? '',
        role:               'authenticated',       // rôle Supabase (pas le rôle métier)
        is_impersonating:   true,
        impersonator_id:    impersonator.id,
        impersonator_email: impersonator.email ?? '',
        session_id:         logRow.id,
        iat:                getNumericDate(0),
        exp:                getNumericDate(TTL_SECONDS),
      },
      key,
    )

    return json({ token, session_id: logRow.id, expires_in: TTL_SECONDS })

  } catch (err) {
    console.error('[impersonate-user] unexpected error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
