// Edge Function : ensure-org-access
// Auto-provisionne un superadmin dans une org comme support non-facturé.
// Appelée quand un superadmin accède à une org pour la première fois.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Identifier l'appelant via son JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { organisation_id } = await req.json()
    if (!organisation_id) {
      return new Response(JSON.stringify({ error: 'organisation_id requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier membership existant
    const { data: existing } = await supabaseAdmin
      .from('organisation_members')
      .select('id, role, is_billable, can_impersonate')
      .eq('user_id', user.id)
      .eq('organisation_id', organisation_id)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ membership: existing, provisioned: false }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier que l'appelant est bien superadmin
    const { data: membership } = await supabaseAdmin
      .from('organisation_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Accès refusé — superadmin requis' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Upsert : accès support, non facturé, avec can_impersonate
    const { data: provisioned, error: upsertError } = await supabaseAdmin
      .from('organisation_members')
      .upsert({
        user_id: user.id,
        organisation_id,
        role: 'superadmin',       // superadmin = is_billable false (généré)
        can_impersonate: true,
        is_active: true,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'organisation_id,user_id' })
      .select('id, role, is_billable, can_impersonate')
      .single()

    if (upsertError) throw upsertError

    // Tracer dans admin_audit_log
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'superadmin_org_access_provisioned',
      target_type: 'organisation',
      target_id: organisation_id,
    })

    return new Response(JSON.stringify({ membership: provisioned, provisioned: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[ensure-org-access]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
