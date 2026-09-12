import { useLocation, useNavigate } from 'react-router-dom'

import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { type AppRoutePath, normalizeRoute, routes } from '../../routes'

export function AppNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentRoute = normalizeRoute(location.pathname)

  return (
    <Tabs value={currentRoute ?? '__not_found__'} onValueChange={(value) => navigate(value as AppRoutePath)}>
      <TabsList aria-label="Prospecting pages">
        {routes.map((route) => (
          <TabsTrigger key={route.path} value={route.path}>
            {route.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
