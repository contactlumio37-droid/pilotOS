// Edge Function : ai-assistant
// Appelle l'API Anthropic (claude-sonnet-4-20250514) et trace l'usage dans ai_usage
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

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

    // Récupérer l'utilisateur depuis le JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { feature, prompt, organisation_id } = await req.json()
    if (!feature || !prompt) {
      return new Response(JSON.stringify({ error: 'feature et prompt requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier le plan + quota si organisation_id fourni
    if (organisation_id) {
      const { data: org } = await supabaseAdmin
        .from('organisations')
        .select('plan')
        .eq('id', organisation_id)
        .single()

      const plan = org?.plan ?? 'free'
      const limit = PLAN_LIMITS[plan] ?? 5

      if (isFinite(limit)) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabaseAdmin
          .from('ai_usage')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', organisation_id)
          .gte('created_at', startOfMonth.toISOString())

        if ((count ?? 0) >= limit) {
          return new Response(JSON.stringify({ error: `Quota IA atteint pour ce mois (plan ${plan})` }), {
            status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // Appel Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic API error: ${err}`)
    }

    const anthropicData = await anthropicRes.json()
    const content = anthropicData.content?.[0]?.text ?? ''
    const tokensUsed = (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0)

    // Tracer l'usage
    if (organisation_id) {
      await supabaseAdmin.from('ai_usage').insert({
        organisation_id,
        user_id: user.id,
        feature,
        tokens_used: tokensUsed,
      })
    }

    return new Response(JSON.stringify({ content, tokensUsed }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[ai-assistant] Erreur:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
