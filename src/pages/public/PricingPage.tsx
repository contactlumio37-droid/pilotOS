import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PLANS, calculatePlanPrice } from '@/lib/stripe'

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '1 utilisateur',
    'Jusqu\'à 10 actions',
    '3 processus',
    '5 documents',
    '5 utilisations IA/mois',
    'Export PDF (watermark)',
  ],
  team: [
    '10 utilisateurs inclus',
    'Actions illimitées',
    'Processus illimités',
    'Documents illimités',
    '50 IA/mois',
    'Module terrain (+5€)',
    'Support email',
  ],
  business: [
    '25 utilisateurs inclus',
    'Tout Team inclus',
    'IA 200 req/mois',
    'Module terrain inclus',
    'Multi-sites',
    'Rapports avancés',
    'Support prioritaire',
  ],
  pro: [
    '50 utilisateurs inclus',
    'Tout Business inclus',
    'IA illimitée',
    'Module sécurité/QSE',
    'Export audit ISO',
    'API access',
    'SLA 99.9%',
  ],
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl text-slate-900">PilotOS</Link>
          <div className="flex gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2">Connexion</Link>
            <Link to="/register" className="btn-primary text-sm py-2">Essai gratuit</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Des tarifs simples et transparents
          </h1>
          <p className="text-slate-500 text-lg">
            Commencez gratuitement. Évoluez quand vous êtes prêt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {(['free', 'team', 'business', 'pro'] as const).map((planKey, i) => {
            const plan = PLANS[planKey]
            const isPopular = planKey === 'business'
            const features = PLAN_FEATURES[planKey] ?? []

            return (
              <motion.div
                key={planKey}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`card relative ${isPopular ? 'border-2 border-brand-600 ring-2 ring-brand-100' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Populaire
                    </span>
                  </div>
                )}

                <h3 className="font-bold text-slate-900 mb-1">{plan.name}</h3>

                <div className="flex items-baseline gap-1 mb-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-slate-900">Gratuit</span>
                  ) : plan.price === null ? (
                    <span className="text-xl font-bold text-slate-900">Sur devis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-slate-900">{plan.price}€</span>
                      <span className="text-slate-400 text-sm">/mois</span>
                    </>
                  )}
                </div>

                {'seats' in plan && plan.seats && (
                  <p className="text-sm text-slate-500 mb-6">{plan.seats} utilisateurs</p>
                )}

                <ul className="space-y-2 mb-8">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="text-slate-600">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    isPopular
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {planKey === 'free' ? 'Commencer gratuitement' : 'Démarrer l\'essai'}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Enterprise */}
        <div className="mt-8 card bg-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">Enterprise & On-premise</h3>
              <p className="text-slate-400 text-sm">
                Utilisateurs illimités, déploiement sur site, SLA garanti, accompagnement dédié.
              </p>
            </div>
            <a href="mailto:contact@pilotos.fr" className="btn-secondary bg-white/10 text-white border-white/20 hover:bg-white/20 shrink-0">
              Nous contacter
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
