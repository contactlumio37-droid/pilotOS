import { motion } from 'framer-motion'

export default function AdminDashboard() {
  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Administration</h1>
        <div className="card text-center py-12 text-slate-400">
          <p className="text-lg font-medium mb-2">Dashboard administrateur</p>
          <p className="text-sm">Toutes les statistiques de votre organisation.</p>
        </div>
      </motion.div>
    </div>
  )
}
