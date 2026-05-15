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

    const { token } = await req.json() as { token: string }
    if (!token) throw new Error('token requis')

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('confirm_token', token)
      .is('unsubscribed_at', null)
      .select('email')
      .single()

    if (error || !data) throw new Error('Token invalide ou déjà utilisé')

    return new Response(
      JSON.stringify({ ok: true, email: data.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
