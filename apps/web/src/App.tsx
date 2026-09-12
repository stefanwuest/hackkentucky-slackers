import { Route, Routes } from 'react-router-dom'

import { CompaniesPage } from './pages/CompaniesPage'
import { CakeCheckoutPage } from './pages/CakeCheckoutPage'
import { CakeReceiptPage } from './pages/CakeReceiptPage'
import { CompanyCakePage } from './pages/CompanyCakePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <main className="app-shell">
      <Routes>
        <Route path="/" element={<CompaniesPage />} />
        <Route path="/cakes/:cakeId" element={<CompanyCakePage />} />
        <Route path="/cakes/:cakeId/checkout" element={<CakeCheckoutPage />} />
        <Route path="/cakes/:cakeId/receipt" element={<CakeReceiptPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  )
}