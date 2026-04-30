import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Invitation {
  id: string
  organisation_id: string
  organisation_name: string
  email: string
  role: string
  token: string
  mode: string
  status: string
  expires_at: string
}

export function useInvitation(token: string | undefined) {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token manquant.')
      setLoading(false)
      return
    }

    async function fetchInvitation() {
      setLoading(true)
      setError(null)
      const { data, error: dbErr } = await supabase
        .from('invitations')
        .select('*, organisation:organisations(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle()

      if (dbErr || !data) {
        setError("Cette invitation est invalide, déjà utilisée ou expirée.")
        setInvitation(null)
      } else {
        const org = Array.isArray(data.organisation) ? data.organisation[0] : data.organisation
        setInvitation({ ...data, organisation_name: org?.name ?? 'Votre organisation' })
      }
      setLoading(false)
    }

    fetchInvitation()
  }, [token])

  async function accept(params: { firstName: string; lastName: string; password?: string }) {
    if (!invitation) throw new Error('Invitation introuvable')

    // Vérifie que l'invitation n'est pas expirée
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("Cette invitation a expiré.")
    }

    // Récupère la session courante pour savoir si un compte existe déjà
    const { data: { session } } = await supabase.auth.getSession()
    let userId: string

    if (session?.user) {
      // Compte existant connecté
      userId = session.user.id
    } else if (params.password) {
      // Crée un nouveau compte
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: invitation.email,
        password: params.password,
        options: { data: { full_name: `${params.firstName} ${params.lastName}` } },
      })
      if (signUpErr || !signUpData.user) throw new Error(signUpErr?.message ?? 'Erreur lors de la création du compte')
      userId = signUpData.user.id
    } else {
      throw new Error('Mot de passe requis pour créer un compte.')
    }

    // Crée ou met à jour le profil
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: `${params.firstName} ${params.lastName}`,
    })

    // Rattache l'utilisateur à l'organisation
    const { error: memberErr } = await supabase.from('organisation_members').upsert({
      user_id: userId,
      organisation_id: invitation.organisation_id,
      role: invitation.role,
      is_active: true,
    }, { onConflict: 'user_id,organisation_id' })
    if (memberErr) throw new Error(memberErr.message)

    // Marque l'invitation comme acceptée
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
  }

  return { invitation, loading, error, accept }
}
