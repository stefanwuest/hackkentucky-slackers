import type { Hono } from 'hono'
import type { AppBindings } from '../types'

export function registerRootRoute(app: Hono<{ Bindings: AppBindings }>) {
  app.get('/', (c) => c.json({ name: 'Zywave Prospect Intelligence API', status: 'ok' }))
}
