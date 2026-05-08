import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Play, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import SEOHead from '@/components/ui/SEOHead'

const SECTORS = [
  'SDIS / Services secours',
  'PME industrielle',
  'Distribution / Logistique',
  'Santé / Médico-social',
  'Collectivité territoriale',
  'Autre',
]

export default function DemoPage() {
  const [form, setForm] = useState({ name: '', email: '', org: '', sector: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.org) { setError('Veuillez remplir tous les champs obligatoires.'); return }
    setLoading(true)
    setError(null)
    try {
      await supabase.from('demo_requests').insert({
        name: form.name,
        email: form.email,
        organisation_name: form.org,
        sector: form.sector || null,
      })
      setSubmitted(true)
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez hello@pilotos.app')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title="Démo" description="Demandez une démo personnalisée de PilotOS et découvrez comment piloter votre organisation simplement." />
      <header className="sticky top-0 z-50 glass-header border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-white font-display font-bold text-xl">PilotOS</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-slate-300 hover:text-white text-sm transition-colors">Connexion</Link>
            <Link to="/register" className="btn-primary text-sm py-2">Commencer gratuitement</Link>
          </div>
        </div>
      </header>

      <section className="bg-slate-900 pt-16 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
              Voir PilotOS en action
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Découvrez comment les PME, SDIS et collectivités pilotent leur organisation avec PilotOS.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-2xl aspect-video flex items-center justify-center mb-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-white/20 transition-colors">
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
              <p className="text-slate-400 text-sm">Vidéo de démonstration — 3 minutes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { icon: CheckCircle2, title: 'Tableau de bord en temps réel', desc: 'Visualisez l\'avancement de toutes vos actions, objectifs et indicateurs en un coup d\'œil.' },
              { icon: Calendar, title: 'Gestion des CODIR', desc: 'Transformez vos décisions de réunion en actions assignées et suivies automatiquement.' },
              { icon: ArrowRight, title: 'Terrain connecté', desc: 'Vos équipes terrain remontent les problèmes en 30 secondes depuis leur téléphone.' },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="card">
                  <Icon className="w-6 h-6 text-brand-600 mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-500 text-sm">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-lg mx-auto">
          {submitted ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Demande reçue !</h2>
              <p className="text-slate-500 mb-6">
                Nous vous contacterons sous 24h pour planifier votre démo personnalisée.
              </p>
              <Link to="/register" className="btn-primary">
                Ou démarrer gratuitement maintenant
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Demander une démo personnalisée</h2>
              <p className="text-slate-500 text-center mb-8">Un expert PilotOS vous présente la plateforme selon votre secteur et vos enjeux.</p>

              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Prénom et nom *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Marie Dupont" />
                </div>
                <div>
                  <label className="label">Email professionnel *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" placeholder="m.dupont@organisation.fr" />
                </div>
                <div>
                  <label className="label">Organisation *</label>
                  <input value={form.org} onChange={e => setForm(f => ({ ...f, org: e.target.value }))} className="input" placeholder="Nom de votre organisation" />
                </div>
                <div>
                  <label className="label">Secteur</label>
                  <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className="input">
                    <option value="">Sélectionnez un secteur</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? 'Envoi...' : 'Demander ma démo'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
