import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface NewsletterFormProps {
  title?: string
  subtitle?: string
  placeholder?: string
  buttonLabel?: string
  source?: string
  className?: string
}

export default function NewsletterForm({
  title = 'Restez informé',
  subtitle = 'Recevez nos actualités produit et conseils QSE directement dans votre boîte mail.',
  placeholder = 'votre@email.fr',
  buttonLabel = 'S\'inscrire',
  source = 'website',
  className = '',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setStatus('loading')

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email: email.toLowerCase().trim(), source, confirmed: false },
        { onConflict: 'email', ignoreDuplicates: false },
      )

    if (error) {
      setStatus('error')
      setMessage('Une erreur est survenue. Réessayez plus tard.')
      return
    }

    setStatus('success')
    setMessage('Merci ! Vérifiez votre email pour confirmer votre inscription.')
    setEmail('')
  }

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-slate-500 mb-4 leading-relaxed">{subtitle}</p>}

      {status === 'success' ? (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            disabled={status === 'loading'}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {buttonLabel}
          </button>
        </form>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {message}
        </div>
      )}
    </div>
  )
}
