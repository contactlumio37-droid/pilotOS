import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { organisation_id, kpi_ids }: { organisation_id: string; kpi_ids: string[] } = await req.json()

    // Vérifier membership ou superadmin
    const [{ data: membership }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('organisation_members')
        .select('id')
        .eq('organisation_id', organisation_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    if (!membership && !profile?.is_superadmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orgId = organisation_id
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const result: Record<string, number> = {}
    const requests: Promise<void>[] = []

    if (kpi_ids.includes('actions_todo')) {
      requests.push(
        supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'todo')
          .then(r => { result['actions_todo'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('actions_in_progress')) {
      requests.push(
        supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'in_progress')
          .then(r => { result['actions_in_progress'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('actions_late')) {
      requests.push(
        supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'late')
          .then(r => { result['actions_late'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('actions_done_month')) {
      requests.push(
        supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'done').gte('completed_at', firstOfMonth)
          .then(r => { result['actions_done_month'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('nc_open')) {
      requests.push(
        supabaseAdmin.from('non_conformities').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).in('status', ['open', 'in_treatment'])
          .then(r => { result['nc_open'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('nc_critical')) {
      requests.push(
        supabaseAdmin.from('non_conformities').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('severity', 'critical').in('status', ['open', 'in_treatment'])
          .then(r => { result['nc_critical'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('terrain_pending')) {
      requests.push(
        supabaseAdmin.from('terrain_reports').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'pending')
          .then(r => { result['terrain_pending'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('projects_active')) {
      requests.push(
        supabaseAdmin.from('projects').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).eq('status', 'active')
          .then(r => { result['projects_active'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('processes_health_avg')) {
      requests.push(
        supabaseAdmin.from('processes').select('health_score')
          .eq('organisation_id', orgId).eq('status', 'active').not('health_score', 'is', null)
          .then(r => {
            const scores = (r.data ?? []).map((p: { health_score: number | null }) => p.health_score ?? 0)
            result['processes_health_avg'] = scores.length
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0
          })
      )
    }
    if (kpi_ids.includes('incidents_open')) {
      requests.push(
        supabaseAdmin.from('incidents').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).in('status', ['open', 'under_analysis'])
          .then(r => { result['incidents_open'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('duer_critical_risks')) {
      requests.push(
        supabaseAdmin.from('duer_evaluations').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).gte('risk_score', 80)
          .then(r => { result['duer_critical_risks'] = r.count ?? 0 })
      )
    }
    if (kpi_ids.includes('docs_to_review')) {
      requests.push(
        supabaseAdmin.from('documents').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId).lte('next_review_date', now.toISOString().slice(0, 10))
          .then(r => { result['docs_to_review'] = r.count ?? 0 })
      )
    }

    await Promise.all(requests)

    return new Response(JSON.stringify({ kpis: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('dashboard-kpis error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
