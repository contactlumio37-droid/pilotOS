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
    const today = now.toISOString().slice(0, 10)
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)

    const result: Record<string, number> = {}
    const requests: Promise<void>[] = []

    // ── KPIs existants ────────────────────────────────────────────────────────

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
          .eq('organisation_id', orgId).lte('next_review_date', today)
          .then(r => { result['docs_to_review'] = r.count ?? 0 })
      )
    }

    // ── Nouveaux KPIs Sprint 0.3 ──────────────────────────────────────────────

    if (kpi_ids.includes('actions_completion_rate')) {
      requests.push(
        Promise.all([
          supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId),
          supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'done'),
        ]).then(([total, done]) => {
          const t = total.count ?? 0
          const d = done.count ?? 0
          result['actions_completion_rate'] = t > 0 ? Math.round((d / t) * 100) : 0
        })
      )
    }

    if (kpi_ids.includes('actions_avg_resolution_days')) {
      requests.push(
        supabaseAdmin.from('actions').select('created_at, completed_at')
          .eq('organisation_id', orgId).eq('status', 'done').not('completed_at', 'is', null)
          .then(r => {
            const rows = r.data ?? []
            if (rows.length === 0) { result['actions_avg_resolution_days'] = 0; return }
            const totalDays = rows.reduce((sum, row) => {
              const diff = new Date(row.completed_at as string).getTime() - new Date(row.created_at).getTime()
              return sum + diff / 86_400_000
            }, 0)
            result['actions_avg_resolution_days'] = Math.round(totalDays / rows.length)
          })
      )
    }

    if (kpi_ids.includes('nc_recurrence_rate')) {
      requests.push(
        supabaseAdmin.from('non_conformities').select('id, root_cause_id')
          .eq('organisation_id', orgId)
          .then(r => {
            const rows = r.data ?? []
            if (rows.length === 0) { result['nc_recurrence_rate'] = 0; return }
            const rootCounts: Record<string, number> = {}
            for (const row of rows) {
              if (row.root_cause_id) {
                rootCounts[row.root_cause_id as string] = (rootCounts[row.root_cause_id as string] ?? 0) + 1
              }
            }
            const recurring = rows.filter(row =>
              row.root_cause_id && (rootCounts[row.root_cause_id as string] ?? 0) > 1
            ).length
            result['nc_recurrence_rate'] = Math.round((recurring / rows.length) * 100)
          })
      )
    }

    if (kpi_ids.includes('workload_per_user')) {
      requests.push(
        Promise.all([
          supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).in('status', ['todo', 'in_progress']),
          supabaseAdmin.from('organisation_members').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('is_active', true),
        ]).then(([activeActions, members]) => {
          const a = activeActions.count ?? 0
          const m = members.count ?? 1
          result['workload_per_user'] = Math.round(a / m)
        })
      )
    }

    if (kpi_ids.includes('docs_review_compliance_rate')) {
      requests.push(
        Promise.all([
          supabaseAdmin.from('documents').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).not('next_review_date', 'is', null),
          supabaseAdmin.from('documents').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).not('next_review_date', 'is', null).gte('next_review_date', today),
        ]).then(([withDate, compliant]) => {
          const total = withDate.count ?? 0
          const ok = compliant.count ?? 0
          result['docs_review_compliance_rate'] = total > 0 ? Math.round((ok / total) * 100) : 100
        })
      )
    }

    if (kpi_ids.includes('kaizen_velocity')) {
      requests.push(
        supabaseAdmin.from('actions').select('*', { count: 'exact', head: true })
          .eq('organisation_id', orgId)
          .eq('origin', 'kaizen')
          .eq('status', 'done')
          .gte('completed_at', firstOfMonth)
          .then(r => { result['kaizen_velocity'] = r.count ?? 0 })
      )
    }

    if (kpi_ids.includes('processes_up_to_date_rate')) {
      requests.push(
        Promise.all([
          supabaseAdmin.from('processes').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'active'),
          supabaseAdmin.from('processes').select('*', { count: 'exact', head: true })
            .eq('organisation_id', orgId).eq('status', 'active').gte('last_review_date', twelveMonthsAgo),
        ]).then(([total, upToDate]) => {
          const t = total.count ?? 0
          const u = upToDate.count ?? 0
          result['processes_up_to_date_rate'] = t > 0 ? Math.round((u / t) * 100) : 100
        })
      )
    }

    await Promise.all(requests)

    return new Response(JSON.stringify({ kpis: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    if (import.meta.env?.DEV) console.error('dashboard-kpis error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
