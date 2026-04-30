// Edge Function : check-ai-quota
// Vérifie le quota IA mensuel d'une organisation selon son plan
import { serve } from 'std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  team: 50,
  business: 200,
  pro: Infinity,
  enterprise: Infinity,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { organisation_id } = await req.json()
    if (!organisation_id) {
      return new Response(JSON.stringify({ error: 'organisation_id requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('plan, ai_enabled')
      .eq('id', organisation_id)
      .single()

    // IA désactivée par défaut — le superadmin doit l'activer explicitement
    if (!org?.ai_enabled) {
      return new Response(JSON.stringify({ allowed: false, remaining: 0, plan: org?.plan ?? 'free', disabled: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const plan = org?.plan ?? 'free'
    const limit = PLAN_LIMITS[plan] ?? 5

    if (!isFinite(limit)) {
      return new Response(JSON.stringify({ allowed: true, remaining: Infinity, plan }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabaseAdmin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', organisation_id)
      .gte('created_at', startOfMonth.toISOString())

    const used = count ?? 0
    const remaining = Math.max(0, limit - used)

    return new Response(JSON.stringify({ allowed: remaining > 0, remaining, plan, used, limit }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[check-ai-quota] Erreur:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
