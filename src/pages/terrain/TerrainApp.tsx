import { Routes, Route } from 'react-router-dom'
import { AlertCircle, ClipboardList, CheckSquare, UserCircle } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import FeedbackButton from '@/components/layout/FeedbackButton'
import ProfilePage from '@/pages/shared/ProfilePage'
import TerrainReportPage from './TerrainReportPage'
import TerrainMyReportsPage from './TerrainMyReportsPage'
import TerrainMyActionsPage from './TerrainMyActionsPage'

const NAV_ITEMS = [
  { to: '/terrain', label: 'Signaler', icon: AlertCircle, end: true },
  { to: '/terrain/remontees', label: 'Mes remontées', icon: ClipboardList },
  { to: '/terrain/actions', label: 'Mes actions', icon: CheckSquare },
  { to: '/terrain/profil', label: 'Profil', icon: UserCircle },
]

export default function TerrainApp() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="main-with-bottom-nav">
        <Routes>
          <Route path="/" element={<TerrainReportPage />} />
          <Route path="/remontees" element={<TerrainMyReportsPage />} />
          <Route path="/actions" element={<TerrainMyActionsPage />} />
          <Route path="/profil" element={<ProfilePage />} />
        </Routes>
      </main>
      <BottomNav items={NAV_ITEMS} />
      <FeedbackButton />
    </div>
  )
}
