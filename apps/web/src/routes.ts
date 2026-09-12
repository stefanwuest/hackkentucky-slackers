export const routes = [
  { path: '/', label: 'Companies' },
  { path: '/renewals', label: 'Renewals' },
  { path: '/scattered-contracts', label: 'Scattered contracts' },
] as const

export type AppRoutePath = (typeof routes)[number]['path']

export function normalizeRoute(pathname: string): AppRoutePath | null {
  if (pathname === '/') return '/'
  if (pathname === '/renewals') return '/renewals'
  if (pathname === '/scattered-contracts') return '/scattered-contracts'
  return null
}
