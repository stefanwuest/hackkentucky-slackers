import { Route, Routes } from 'react-router-dom'

import { CompaniesPage } from './pages/CompaniesPage'
import { CompanyCakePage } from './pages/CompanyCakePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <main className="app-shell">
      <Routes>
        <Route path="/" element={<CompaniesPage />} />
        <Route path="/cakes/:cakeId" element={<CompanyCakePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  )
}
