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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Non authentifié')

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) throw new Error('Non authentifié')

    const { action, organisation_id } = await req.json() as {
      action: 'seed' | 'clear'
      organisation_id: string
    }

    if (!organisation_id) throw new Error('organisation_id requis')

    // Autorisation : superadmin OU admin de l'organisation
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from('profiles').select('is_superadmin').eq('id', user.id).single(),
      supabase.from('organisation_members')
        .select('role')
        .eq('organisation_id', organisation_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    const isSuperAdmin = profile?.is_superadmin === true
    const isOrgAdmin   = ['admin', 'director', 'manager'].includes(membership?.role ?? '')

    if (!isSuperAdmin && !isOrgAdmin) throw new Error('Accès refusé — admin requis')

    if (action === 'clear') {
      await Promise.all([
        supabase.from('actions').delete().eq('organisation_id', organisation_id).eq('is_demo', true),
        supabase.from('non_conformities').delete().eq('organisation_id', organisation_id).eq('is_demo', true),
        supabase.from('strategic_objectives').delete().eq('organisation_id', organisation_id).eq('is_demo', true),
        supabase.from('terrain_reports').delete().eq('organisation_id', organisation_id).eq('is_demo', true),
        supabase.from('processes').delete().eq('organisation_id', organisation_id).eq('is_demo', true),
        supabase.from('indicators').delete().eq('organisation_id', organisation_id).eq('is_demo', true),
      ])

      return new Response(
        JSON.stringify({ ok: true, message: 'Données de démo supprimées' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action !== 'seed') throw new Error('action invalide — "seed" ou "clear"')

    const now = new Date()
    const future30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const past7    = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString()
    const past30   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // ── 5 actions ──────────────────────────────────────────────────────────────
    const { error: actionsError } = await supabase.from('actions').insert([
      {
        organisation_id, is_demo: true,
        title: 'Réviser le plan de prévention incendie',
        status: 'todo', priority: 'high', due_date: future30,
        visibility: 'public', origin: 'manual', created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        title: 'Formation SST — 5 nouveaux collaborateurs',
        status: 'in_progress', priority: 'medium', due_date: future30,
        visibility: 'public', origin: 'manual', created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        title: 'Mise à jour des fiches de données sécurité',
        status: 'done', priority: 'medium', due_date: past7, completed_at: past7,
        visibility: 'public', origin: 'manual', created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        title: 'Audit interne ISO 9001 — Section 8',
        status: 'todo', priority: 'critical', due_date: future30,
        visibility: 'public', origin: 'audit', created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        title: 'Mise à jour du document unique (DUERP)',
        status: 'in_progress', priority: 'high', due_date: future30,
        visibility: 'public', origin: 'manual', created_by: user.id,
      },
    ])
    if (actionsError) throw actionsError

    // ── 2 non-conformités ──────────────────────────────────────────────────────
    const { error: ncError } = await supabase.from('non_conformities').insert([
      {
        organisation_id, is_demo: true,
        title: 'Défaut étiquetage produits chimiques',
        severity: 'major', status: 'open', detected_at: past7,
        created_by: user.id, visibility: 'public',
      },
      {
        organisation_id, is_demo: true,
        title: 'Non-conformité emballages — lot #2024-11',
        severity: 'minor', status: 'in_treatment', detected_at: past30,
        created_by: user.id, visibility: 'public',
      },
    ])
    if (ncError) throw ncError

    // ── 1 objectif stratégique ────────────────────────────────────────────────
    const { error: objError } = await supabase.from('strategic_objectives').insert([
      {
        organisation_id, is_demo: true,
        title: 'Obtenir la certification ISO 9001:2015',
        status: 'active',
        target_date: new Date(now.getFullYear(), 11, 31).toISOString(),
        visibility: 'public', created_by: user.id,
      },
    ])
    if (objError) throw objError

    // ── 1 signalement terrain ─────────────────────────────────────────────────
    const { error: trError } = await supabase.from('terrain_reports').insert([
      {
        organisation_id, is_demo: true,
        title: 'Fuite huile machine Z-12',
        category: 'equipment', status: 'pending',
        description: 'Fuite constatée au niveau de la pompe principale',
        created_by: user.id, visibility: 'public',
      },
    ])
    if (trError) throw trError

    // ── 3 processus ───────────────────────────────────────────────────────────
    const { error: procError } = await supabase.from('processes').insert([
      {
        organisation_id, is_demo: true,
        title: 'Gestion des non-conformités', process_type: 'support',
        status: 'active', health_score: 72, visibility: 'public',
        created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        title: 'Accueil et intégration des nouveaux collaborateurs', process_type: 'support',
        status: 'active', health_score: 85, visibility: 'public',
        created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        title: 'Maîtrise des documents', process_type: 'management',
        status: 'active', health_score: 60, visibility: 'public',
        created_by: user.id,
      },
    ])
    if (procError) throw procError

    // ── 2 indicateurs ─────────────────────────────────────────────────────────
    const { error: indError } = await supabase.from('indicators').insert([
      {
        organisation_id, is_demo: true,
        name: 'Taux d\'actions terminées à temps', unit: '%',
        target_value: 80, frequency: 'monthly', is_active: true,
        created_by: user.id,
      },
      {
        organisation_id, is_demo: true,
        name: 'Nombre de NC ouvertes', unit: 'NC',
        target_value: 0, frequency: 'monthly', is_active: true,
        created_by: user.id,
      },
    ])
    if (indError) throw indError

    return new Response(
      JSON.stringify({ ok: true, message: 'Données de démo créées' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
