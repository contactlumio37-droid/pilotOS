import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BarChart2, GitBranch, FolderOpen, AlertCircle, CheckCircle2, Star, ChevronDown, ChevronUp, Menu, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import SEOHead from '@/components/ui/SEOHead'

const FEATURES = [
  { icon: BarChart2, title: 'Pilotage stratégique', desc: 'Objectifs, CODIR, indicateurs — tout relié. Décidez en confiance.' },
  { icon: GitBranch, title: 'Processus ISO 9001', desc: 'Cartographiez, révisez et améliorez vos processus. Audit sans stress.' },
  { icon: FolderOpen, title: 'GED maîtrisée', desc: 'Versionning, circuit de validation, registre audit. Zéro chaos documentaire.' },
  { icon: AlertCircle, title: 'Terrain connecté', desc: 'Un signalement en 30 secondes. Une action dans le tableau du manager en temps réel.' },
]

const STEPS = [
  { n: '01', title: 'Créez votre espace en 5 minutes', desc: 'Choisissez votre secteur, importez vos données ou repartez d\'un modèle. Aucune formation requise.' },
  { n: '02', title: 'Invitez votre équipe', desc: 'Chaque rôle voit exactement ce qui le concerne. Terrain, managers, direction — une seule plateforme.' },
  { n: '03', title: 'Pilotez et améliorez', desc: 'Les décisions deviennent des actions, les actions génèrent des indicateurs, les indicateurs informent les décisions.' },
]

const TESTIMONIALS = [
  { name: 'Sophie M.', role: 'Responsable QSE, PME industrielle', text: 'Notre dernier audit ISO 9001 s\'est passé sans stress. Tous les enregistrements étaient là, tracés, accessibles en un clic.', stars: 5 },
  { name: 'Jean-Luc D.', role: 'Chef de groupement, SDIS 47', text: 'Les remontées terrain de nos équipes arrivent directement dans le tableau de bord. On a divisé par 3 le temps de traitement des signalements.', stars: 5 },
  { name: 'Aurélie R.', role: 'DG, Collectivité territoriale', text: 'Enfin un outil qui relie nos CODIR à nos plans d\'action. Le suivi est automatique, la direction est informée en temps réel.', stars: 5 },
]

const FAQS = [
  { q: 'PilotOS convient-il aux petites organisations ?', a: 'Absolument. Notre plan Free est conçu pour les structures de 1 à quelques personnes. Les PME à partir de 5 collaborateurs peuvent activer le plan Team pour un pilotage complet.' },
  { q: 'Nos données sont-elles hébergées en France ?', a: 'Oui. PilotOS utilise Supabase avec hébergement AWS Paris (eu-west-3). Vos données ne quittent jamais l\'Union européenne.' },
  { q: 'Peut-on importer nos processus existants ?', a: 'Oui, vous pouvez importer des fichiers CSV pour les actions, et notre bibliothèque propose des templates sectoriels pré-remplis pour les SDIS, PME industrielles et collectivités.' },
  { q: 'Quelle est la différence avec un simple Excel de suivi ?', a: 'PilotOS relie tout : une décision CODIR génère une action, l\'action met à jour un indicateur, l\'indicateur alerte le responsable. Un Excel ne peut pas faire ça en temps réel avec 20 personnes.' },
  { q: 'Comment fonctionne le support ?', a: 'Les plans Free bénéficient du support communautaire (forum + FAQ). Les plans Team et supérieur incluent le support email avec réponse sous 24h ouvrées.' },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="font-medium text-slate-900">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && <p className="pb-5 text-slate-600 text-sm leading-relaxed">{a}</p>}
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (mobileMenuOpen) firstLinkRef.current?.focus()
  }, [mobileMenuOpen])

  function closeMobileMenu() { setMobileMenuOpen(false) }

  return (
    <div className="min-h-screen bg-white">
      <SEOHead />
      {/* Header */}
      <header className="sticky top-0 z-50 glass-header border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-white font-display font-bold text-xl">PilotOS</span>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-slate-300 hover:text-white text-sm transition-colors">Tarifs</Link>
            <Link to="/roadmap" className="text-slate-300 hover:text-white text-sm transition-colors">Roadmap</Link>
            <Link to="/demo" className="text-slate-300 hover:text-white text-sm transition-colors">Démo</Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-slate-300 hover:text-white text-sm transition-colors">Connexion</Link>
            <Link to="/register" className="btn-primary text-sm py-2">Commencer gratuitement</Link>
          </div>
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 top-16 bg-black/40 z-40 md:hidden"
                onClick={closeMobileMenu}
                aria-hidden="true"
              />
              {/* Drawer */}
              <motion.div
                role="dialog"
                aria-label="Menu de navigation"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10 z-50 md:hidden px-6 py-4"
              >
                <nav className="flex flex-col">
                  <Link ref={firstLinkRef} to="/pricing" onClick={closeMobileMenu} className="py-3 text-lg font-medium text-slate-200 hover:text-white transition-colors border-b border-white/10">Tarifs</Link>
                  <Link to="/roadmap" onClick={closeMobileMenu} className="py-3 text-lg font-medium text-slate-200 hover:text-white transition-colors border-b border-white/10">Roadmap</Link>
                  <Link to="/demo" onClick={closeMobileMenu} className="py-3 text-lg font-medium text-slate-200 hover:text-white transition-colors border-b border-white/10">Démo</Link>
                  <div className="pt-4 pb-2 flex flex-col gap-3">
                    <Link to="/login" onClick={closeMobileMenu} className="py-3 text-lg font-medium text-slate-300 hover:text-white transition-colors text-center border border-white/20 rounded-lg">Connexion</Link>
                    <Link to="/register" onClick={closeMobileMenu} className="btn-primary py-3 text-base text-center">Commencer gratuitement</Link>
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main>
      {/* Hero */}
      <section className="bg-slate-900 pt-24 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="inline-flex items-center gap-2 bg-brand-900/50 border border-brand-700/50 text-brand-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              Conçu pour les PME, SDIS et collectivités françaises
            </div>
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
              <Link to="/demo" className="btn-secondary text-base px-8 py-4 bg-white/10 text-white border-white/40 hover:bg-white/20">
                Voir la démo
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">Gratuit, sans CB. Setup en 5 minutes.</p>
          </motion.div>
        </div>
      </section>

      {/* Social proof numbers */}
      <section className="py-16 px-6 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '< 5 min', label: 'Pour démarrer' },
              { value: '🇫🇷', label: 'Hébergement France' },
              { value: 'ISO 9001', label: 'Compatible' },
              { value: '100%', label: 'RGPD compliant' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-2xl font-bold text-slate-900 mb-1">{item.value}</div>
                <div className="text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Tout ce dont votre organisation a besoin</h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">Stratégie, processus, documents, terrain. Relié. Tracé. Mesuré.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div key={feature.title} initial={{ y: 8, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="card-hover">
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

      {/* How it works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Comment ça marche ?</h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">Trois étapes pour transformer votre façon de piloter.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(step => (
              <motion.div key={step.n} initial={{ y: 8, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-display font-bold text-xl flex items-center justify-center mx-auto mb-5">
                  {step.n}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">Ce qu'en disent nos clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <motion.div key={t.name} initial={{ y: 8, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="card">
                <div className="flex mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à piloter autrement ?</h2>
          <p className="text-brand-200 mb-8">Gratuit pour commencer. Aucune CB requise.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-lg hover:bg-brand-50 transition-colors">
              Créer mon espace gratuit
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 border border-brand-400 text-white font-semibold px-8 py-4 rounded-lg hover:bg-brand-500 transition-colors">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Questions fréquentes</h2>
          <div className="divide-y divide-slate-100">
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <span className="text-white font-display font-bold text-lg block mb-4">PilotOS</span>
              <p className="text-slate-500 text-sm leading-relaxed">Pilotage opérationnel pour PME, SDIS et collectivités françaises.</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium text-sm mb-3">Produit</p>
              <ul className="space-y-2">
                <li><Link to="/pricing" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Tarifs</Link></li>
                <li><Link to="/roadmap" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Roadmap</Link></li>
                <li><Link to="/demo" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Démo</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-slate-400 font-medium text-sm mb-3">Légal</p>
              <ul className="space-y-2">
                <li><a href="/cgu" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">CGU</a></li>
                <li><a href="/confidentialite" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Confidentialité</a></li>
                <li><a href="/mentions-legales" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Mentions légales</a></li>
              </ul>
            </div>
            <div>
              <p className="text-slate-400 font-medium text-sm mb-3">Contact</p>
              <ul className="space-y-2">
                <li><a href="mailto:hello@pilotos.app" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">hello@pilotos.app</a></li>
                <li><Link to="/demo" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Demander une démo</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-xs">© 2026 PilotOS SAS. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-slate-600 text-xs">Hébergé en France · RGPD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
