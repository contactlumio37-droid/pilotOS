import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { query } = await req.json() as { query: string }

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ organisations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const normalized = query.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')

    // Search by normalized_name similarity or name ilike
    const { data, error } = await supabase
      .from('organisations')
      .select('id, name, slug, logo_url, plan, normalized_name')
      .or(`name.ilike.%${query.trim()}%,normalized_name.ilike.%${normalized}%`)
      .eq('is_active', true)
      .order('name')
      .limit(8)

    if (error) throw error

    // Count active members for each org (to display size info)
    const orgsWithMembers = await Promise.all(
      (data ?? []).map(async (org) => {
        const { count } = await supabase
          .from('organisation_members')
          .select('id', { count: 'exact', head: true })
          .eq('organisation_id', org.id)
          .eq('is_active', true)
        return { ...org, member_count: count ?? 0 }
      }),
    )

    return new Response(
      JSON.stringify({ organisations: orgsWithMembers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
