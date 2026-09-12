import { Navigate, Route, Routes } from 'react-router-dom'

import { AppNavigation } from './components/layout/AppNavigation'
import { CompaniesPage } from './pages/CompaniesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RenewalsPage } from './pages/RenewalsPage'
import { ScatteredContractsPage } from './pages/ScatteredContractsPage'

export default function App() {
  return (
    <main className="app-shell">
      <AppNavigation />
      <Routes>
        <Route path="/" element={<CompaniesPage />} />
        <Route path="/renewals" element={<RenewalsPage />} />
        <Route path="/scattered-contracts" element={<ScatteredContractsPage />} />
        <Route path="/scattered-renewals" element={<Navigate to="/scattered-contracts" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  )
}
