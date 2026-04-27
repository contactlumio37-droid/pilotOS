import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Mail, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { NewsletterSubscriber } from '@/types/database'

export default function NewsletterTab() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sentMsg, setSentMsg] = useState<string | null>(null)

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ['superadmin_newsletter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as NewsletterSubscriber[]
    },
  })

  const confirmed = subscribers.filter(s => s.confirmed)

  const sendNewsletter = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non connecté')

      const results = await Promise.allSettled(
        confirmed.map(sub =>
          supabase.functions.invoke('send-email', {
            body: {
              to: sub.email,
              subject,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">${body.replace(/\n/g, '<br>')}</div>`,
            },
          }),
        ),
      )

      const failed = results.filter(r => r.status === 'rejected').length
      return { sent: confirmed.length - failed, failed }
    },
    onSuccess: ({ sent, failed }) => {
      setSentMsg(`✅ ${sent} emails envoyés${failed > 0 ? ` · ${failed} échecs` : ''}`)
      setSubject('')
      setBody('')
    },
    onError: (err: Error) => setSentMsg(`Erreur : ${err.message}`),
  })

  async function handleSend() {
    if (!subject || !body || confirmed.length === 0) return
    setSentMsg(null)
    setSending(true)
    try {
      await sendNewsletter.mutateAsync()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Newsletter</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs text-slate-400">Confirmés</span>
            </div>
            <p className="text-2xl font-bold text-white">{confirmed.length}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs text-slate-400">En attente</span>
            </div>
            <p className="text-2xl font-bold text-white">{subscribers.length - confirmed.length}</p>
          </div>
        </div>
      </div>

      {/* Send form */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Envoyer une newsletter</h3>
          <span className="text-xs text-slate-500 ml-auto">→ {confirmed.length} destinataire{confirmed.length !== 1 ? 's' : ''}</span>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Sujet</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Les nouveautés PilotOS de ce mois"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Corps du message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            placeholder="Bonjour,&#10;&#10;Voici les dernières nouvelles de PilotOS..."
          />
        </div>

        {sentMsg && (
          <p className="text-sm text-slate-300 bg-slate-700 rounded-lg px-3 py-2">{sentMsg}</p>
        )}

        <button
          onClick={handleSend}
          disabled={!subject || !body || confirmed.length === 0 || sending}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Mail className="w-4 h-4" />
          {sending ? 'Envoi en cours…' : `Envoyer à ${confirmed.length} abonné${confirmed.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Subscribers list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Abonnés ({subscribers.length})</h3>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="space-y-1">
            {subscribers.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2.5 border border-slate-700">
                <span className={`w-2 h-2 rounded-full shrink-0 ${sub.confirmed ? 'bg-green-500' : 'bg-slate-600'}`} />
                <span className="text-sm text-white flex-1">{sub.email}</span>
                {sub.source && <span className="text-xs text-slate-500">{sub.source}</span>}
                <span className="text-xs text-slate-500 shrink-0">
                  {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
            {subscribers.length === 0 && (
              <p className="text-center py-8 text-slate-500">Aucun abonné pour l'instant.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
