import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import SignatureCanvas from '@/components/features/SignatureCanvas'
import type { SignatureRequest } from '@/types/database'

type PageState = 'loading' | 'ready' | 'wrong_user' | 'already_signed' | 'expired' | 'success' | 'error'

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')

  const { data: request } = useQuery<SignatureRequest | null>({
    queryKey: ['signature_request', token],
    enabled: !!token && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('token', token!)
        .single()
      if (error || !data) { setPageState('error'); return null }
      const req = data as SignatureRequest
      if (req.recipient_id !== user!.id) { setPageState('wrong_user'); return req }
      if (req.status === 'signed') { setPageState('already_signed'); return req }
      if (new Date(req.expires_at) < new Date()) { setPageState('expired'); return req }
      setPageState('ready')
      return req
    },
  })

  const { data: document } = useQuery({
    queryKey: ['document_for_sign', request?.document_id],
    enabled: !!request?.document_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('id, title, doc_type, status, created_at, organisation_id')
        .eq('id', request!.document_id)
        .single()
      return data
    },
  })

  const signMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      if (!request || !user) throw new Error('Données manquantes')

      // Upload signature image to storage
      const blob = await fetch(dataUrl).then(r => r.blob())
      const path = `${request.organisation_id}/${request.document_id}/${user.id}/${Date.now()}.png`
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(path, blob, { contentType: 'image/png', upsert: true })
      if (uploadError) throw uploadError

      // Update signature_request
      const { error: reqError } = await supabase
        .from('signature_requests')
        .update({ status: 'signed', signed_at: new Date().toISOString(), signature_storage_path: path })
        .eq('id', request.id)
      if (reqError) throw reqError

      // Upsert document_acknowledgment
      await supabase.from('document_acknowledgments').upsert(
        { document_id: request.document_id, user_id: user.id, acknowledged_at: new Date().toISOString(), signature_storage_path: path },
        { onConflict: 'document_id,user_id' },
      )

      setPageState('success')
    },
    onError: () => setPageState('error'),
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm p-6">
          <ShieldCheck className="w-12 h-12 text-brand-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Connexion requise</h1>
          <p className="text-slate-500 text-sm mb-4">Vous devez être connecté pour signer ce document.</p>
          <button
            onClick={() => navigate(`/login?redirect=/sign/${token}`)}
            className="btn-primary"
          >
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    )
  }

  if (pageState === 'wrong_user') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lien non autorisé</h1>
          <p className="text-slate-500 text-sm">Ce lien de signature ne vous est pas destiné. Vérifiez l'adresse email utilisée pour vous connecter.</p>
        </div>
      </div>
    )
  }

  if (pageState === 'already_signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Document déjà signé</h1>
          <p className="text-slate-500 text-sm">Vous avez déjà signé ce document le {request?.signed_at ? new Date(request.signed_at).toLocaleDateString('fr-FR') : ''}.</p>
        </div>
      </div>
    )
  }

  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lien expiré</h1>
          <p className="text-slate-500 text-sm">Ce lien de signature a expiré. Contactez votre responsable pour obtenir un nouveau lien.</p>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Document signé !</h1>
          <p className="text-slate-500 text-sm mb-6">Votre signature a été enregistrée avec succès.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-7 h-7 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Signature électronique</h1>
            <p className="text-sm text-slate-500">PilotOS</p>
          </div>
        </div>

        {/* Document info */}
        <div className="card mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Document à signer</p>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{document?.title ?? '—'}</h2>
          {document?.doc_type && (
            <span className="badge badge-neutral text-xs">{document.doc_type}</span>
          )}
          {request?.message && (
            <div className="mt-3 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              <p className="text-xs text-brand-700 italic">"{request.message}"</p>
            </div>
          )}
        </div>

        {/* Signature area */}
        <div className="card">
          <p className="text-sm font-semibold text-slate-700 mb-1">Votre signature</p>
          <p className="text-xs text-slate-400 mb-4">
            En signant, vous confirmez avoir pris connaissance de ce document.
            Date : {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.
          </p>

          <SignatureCanvas
            onSave={dataUrl => {
              setSignatureDataUrl(dataUrl)
              signMutation.mutate(dataUrl)
            }}
            onClear={() => setSignatureDataUrl(null)}
          />

          {signMutation.isPending && (
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement de la signature…
            </div>
          )}

          {pageState === 'error' && (
            <p className="mt-3 text-sm text-red-600">Une erreur est survenue. Réessayez.</p>
          )}

          {/* Legal notice */}
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
            Cette signature électronique simple constitue un accord de votre part sur le contenu du document.
            Elle est tracée avec votre authentification PilotOS (email : {user.email}) et horodatée.
          </p>
        </div>
      </div>
    </div>
  )
}
