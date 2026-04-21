import { Routes, Route } from 'react-router-dom'
import { AlertCircle, ClipboardList, CheckSquare } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import TerrainReportPage from './TerrainReportPage'
import TerrainMyReportsPage from './TerrainMyReportsPage'
import TerrainMyActionsPage from './TerrainMyActionsPage'

const NAV_ITEMS = [
  { to: '/terrain', label: 'Signaler', icon: AlertCircle, end: true },
  { to: '/terrain/remontees', label: 'Mes remontées', icon: ClipboardList },
  { to: '/terrain/actions', label: 'Mes actions', icon: CheckSquare },
]

// Profil terrain — bottom nav uniquement, 3 écrans max
export default function TerrainApp() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="main-with-bottom-nav">
        <Routes>
          <Route path="/" element={<TerrainReportPage />} />
          <Route path="/remontees" element={<TerrainMyReportsPage />} />
          <Route path="/actions" element={<TerrainMyActionsPage />} />
        </Routes>
      </main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
