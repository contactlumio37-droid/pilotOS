// Edge Function: kpi-snapshot
// Called daily by pg_cron at 23:00 UTC.
// Reads the latest indicator_values for each indicator and upserts into kpi_snapshots.
// This feeds the BI Hub (BIHubPage) with historical KPI data.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const today = new Date().toISOString().slice(0, 10)

    // Fetch all indicators (across all orgs)
    const { data: indicators, error: indErr } = await admin
      .from('indicators')
      .select('id, organisation_id, title, target_value')

    if (indErr) throw indErr
    if (!indicators?.length) {
      return new Response(JSON.stringify({ ok: true, snapshots: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // For each indicator, get its latest measured value
    const snapshots: Array<{
      organisation_id: string
      kpi_id: string
      snapshot_date: string
      value: number
      target: number | null
    }> = []

    for (const ind of indicators) {
      const { data: latest } = await admin
        .from('indicator_values')
        .select('value')
        .eq('indicator_id', ind.id)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latest?.value !== undefined && latest.value !== null) {
        snapshots.push({
          organisation_id: ind.organisation_id,
          kpi_id: ind.title,
          snapshot_date: today,
          value: latest.value as number,
          target: (ind.target_value as number | null) ?? null,
        })
      }
    }

    if (!snapshots.length) {
      return new Response(JSON.stringify({ ok: true, snapshots: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { error: upsertErr } = await admin
      .from('kpi_snapshots')
      .upsert(snapshots, { onConflict: 'organisation_id,kpi_id,snapshot_date' })

    if (upsertErr) throw upsertErr

    return new Response(JSON.stringify({ ok: true, snapshots: snapshots.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
