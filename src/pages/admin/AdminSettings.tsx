import { motion } from 'framer-motion'
import { Settings, Shield, Bell, CreditCard } from 'lucide-react'

export default function AdminSettings() {
  return (
    <div className="max-w-3xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Paramètres</h1>

        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-slate-900">Organisation</h2>
            </div>
            <p className="text-sm text-slate-500">Nom, logo, secteur, modules actifs.</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-slate-900">Sécurité & MFA</h2>
            </div>
            <p className="text-sm text-slate-500">
              Politique MFA, rôles, permissions par module.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-slate-900">Notifications</h2>
            </div>
            <p className="text-sm text-slate-500">
              Alertes actions en retard, signalements terrain, revues dues.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-slate-900">Abonnement & Facturation</h2>
            </div>
            <p className="text-sm text-slate-500">
              Plan actuel, sièges, facturation Stripe.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
