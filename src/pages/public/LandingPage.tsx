import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart2, GitBranch, FolderOpen, AlertCircle } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart2,
    title: 'Pilotage stratégique',
    desc: 'Objectifs, CODIR, indicateurs — tout relié. Décidez en confiance.',
  },
  {
    icon: GitBranch,
    title: 'Processus ISO 9001',
    desc: 'Cartographiez, révisez et améliorez vos processus. Audit sans stress.',
  },
  {
    icon: FolderOpen,
    title: 'GED maîtrisée',
    desc: 'Versionning, circuit de validation, registre audit. Zéro chaos documentaire.',
  },
  {
    icon: AlertCircle,
    title: 'Terrain connecté',
    desc: 'Un signalement en 30 secondes. Un action dans le tableau du manager en temps réel.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-header border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-white font-display font-bold text-xl">PilotOS</span>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-slate-300 hover:text-white text-sm transition-colors">
              Tarifs
            </Link>
            <Link to="/roadmap" className="text-slate-300 hover:text-white text-sm transition-colors">
              Roadmap
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-slate-300 hover:text-white text-sm transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-900 pt-24 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-5xl md:text-6xl font-display font-black text-white mb-6 leading-tight">
              Pilotez votre organisation.{' '}
              <span className="text-brand-400">Vraiment.</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Une décision prise en CODIR devient une action assignée, suivie, mesurée — sans réunion de suivi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-base px-8 py-4">
                Démarrer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/demo" className="btn-secondary text-base px-8 py-4 bg-white/10 text-white border-white/20 hover:bg-white/20">
                Voir la démo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Tout ce dont votre organisation a besoin
          </h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
            Stratégie, processus, documents, terrain. Relié. Tracé. Mesuré.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ y: 8, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="card-hover"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-500 text-sm">{feature.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { label: 'PME & SDIS', value: 'Conçu pour' },
              { label: 'Setup en', value: '< 5 min' },
              { label: 'Données', value: 'Hébergées en 🇫🇷' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-2xl font-bold text-slate-900 mb-1">{item.value}</div>
                <div className="text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à piloter autrement ?
          </h2>
          <p className="text-brand-200 mb-8">
            Gratuit pour commencer. Aucune CB requise.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-lg hover:bg-brand-50 transition-colors">
            Créer mon espace gratuit
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-white font-display font-bold">PilotOS</span>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link to="/pricing" className="hover:text-slate-300">Tarifs</Link>
            <Link to="/roadmap" className="hover:text-slate-300">Roadmap</Link>
            <a href="/cgu" className="hover:text-slate-300">CGU</a>
            <a href="/confidentialite" className="hover:text-slate-300">Confidentialité</a>
          </div>
          <p className="text-slate-600 text-xs">© 2026 PilotOS. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
