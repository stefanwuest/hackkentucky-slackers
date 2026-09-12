import type { Hono } from 'hono'
import type { AppBindings } from '../types'

export function registerHealthRoute(app: Hono<{ Bindings: AppBindings }>) {
  app.get('/api/health', (c) => c.json({ status: 'ok' }))
}
