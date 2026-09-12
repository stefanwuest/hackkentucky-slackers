import { Navigate, Route, Routes } from 'react-router-dom'

import { CompaniesPage } from './pages/CompaniesPage'
import { CakeCheckoutPage } from './pages/CakeCheckoutPage'
import { CakeReceiptPage } from './pages/CakeReceiptPage'
import { CompanyCakePage } from './pages/CompanyCakePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProspectMethodsPage } from './pages/ProspectMethodsPage'
import { getBusinessCardProfile } from './features/profile/profileStorage'

function HomeRoute() {
  return getBusinessCardProfile() ? <CompaniesPage /> : <Navigate to="/profile" replace />
}

export default function App() {
  return (
    <main className="app-shell">
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/prospect/:prospectId" element={<ProspectMethodsPage />} />
        <Route path="/cakes/:cakeId" element={<CompanyCakePage />} />
        <Route path="/cakes/:cakeId/checkout" element={<CakeCheckoutPage />} />
        <Route path="/cakes/:cakeId/receipt" element={<CakeReceiptPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  )
}