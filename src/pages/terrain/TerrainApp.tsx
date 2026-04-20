import { Routes, Route, NavLink } from 'react-router-dom'
import { AlertCircle, ClipboardList, CheckSquare } from 'lucide-react'
import TerrainReportPage from './TerrainReportPage'
import TerrainMyReportsPage from './TerrainMyReportsPage'
import TerrainMyActionsPage from './TerrainMyActionsPage'

// Profil terrain — 3 écrans max, bottom nav uniquement
export default function TerrainApp() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <Routes>
        <Route path="/" element={<TerrainReportPage />} />
        <Route path="/remontees" element={<TerrainMyReportsPage />} />
        <Route path="/actions" element={<TerrainMyActionsPage />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink
          to="/terrain"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <AlertCircle className="w-5 h-5" />
          Signaler
        </NavLink>

        <NavLink
          to="/terrain/remontees"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <ClipboardList className="w-5 h-5" />
          Mes remontées
        </NavLink>

        <NavLink
          to="/terrain/actions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <CheckSquare className="w-5 h-5" />
          Mes actions
        </NavLink>
      </nav>
    </div>
  )
}
