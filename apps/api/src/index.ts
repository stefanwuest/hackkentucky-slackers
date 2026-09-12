import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { registerCompaniesRoute } from './routes/companies'
import { registerHealthRoute } from './routes/health'
import { registerRenewalsRoute } from './routes/renewals'
import { registerRootRoute } from './routes/root'
import { registerScatteredRenewalsRoute } from './routes/scattered-renewals'
import type { AppBindings } from './types'

const app = new Hono<{ Bindings: AppBindings }>()

app.use('/api/*', cors())

registerRootRoute(app)
registerHealthRoute(app)
registerCompaniesRoute(app)
registerRenewalsRoute(app)
registerScatteredRenewalsRoute(app)

export default app
