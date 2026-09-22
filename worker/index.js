// Cloudflare Worker entry point — the whole API, no separate frontend
// server. GitHub Pages hosts the static frontend; this Worker is called
// cross-origin, so the CORS and session-cookie logic below matter more
// than they would for a same-origin deploy.
import { Hono } from 'hono'
import { allowedOrigins } from './lib/util.js'
import { authRequired, isAuthed, OPEN_PATHS } from './lib/session.js'
import { authRoutes } from './routes/auth.js'
import { emailsRoutes } from './routes/emails.js'
import { calendarRoutes } from './routes/calendar.js'
import { exchangeRoutes } from './routes/exchange.js'
import { newsRoutes } from './routes/news.js'
import { integrationsRoutes } from './routes/integrations.js'

const app = new Hono()

// CORS: only origins listed in ALLOWED_ORIGINS may read responses — these
// endpoints expose inbox/calendar data, so no wildcard. The Private-Network
// header satisfies Chrome's preflight when a public site talks to a
// backend Cloudflare treats as a "private" address (rare here, but harmless).
app.use('*', async (c, next) => {
  const origin = (c.req.header('origin') || '').replace(/\/$/, '')
  if (origin && allowedOrigins(c.env).includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Vary', 'Origin')
    c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Accept')
    // Lets the session cookie ride along on cross-origin requests from an
    // allowed frontend (e.g. GitHub Pages). Requires a specific origin
    // above, never a wildcard.
    c.header('Access-Control-Allow-Credentials', 'true')
    if (c.req.header('access-control-request-private-network') === 'true') {
      c.header('Access-Control-Allow-Private-Network', 'true')
    }
  }
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})

// Login gate in front of the data API. Active only when DASHBOARD_PASSWORD
// is set; /api/health and the auth endpoints stay open so the login screen
// can load and hosts can health-check. See lib/session.js.
app.use('/api/*', async (c, next) => {
  if (!authRequired(c.env)) return next()
  if (OPEN_PATHS.has(c.req.path)) return next()
  if (await isAuthed(c.env, c.req.header('cookie'))) return next()
  return c.json({ error: 'authentication required' }, 401)
})

app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))
app.route('/api/auth', authRoutes)
app.route('/api/emails', emailsRoutes)
app.route('/api/calendar', calendarRoutes)
app.route('/api/exchange', exchangeRoutes)
app.route('/api/news', newsRoutes)
app.route('/api/integrations', integrationsRoutes)

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

export default app
