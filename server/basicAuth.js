import crypto from 'node:crypto'

// Optional HTTP Basic auth in front of the whole dashboard. The app has no
// login of its own, so when it's exposed on a public URL set DASHBOARD_PASSWORD
// (and optionally DASHBOARD_USER, default "admin") to keep inboxes/calendars
// private. Leave it unset for local/LAN use and the gate is a no-op — nothing
// changes for existing setups.

// Constant-time string compare. Hashing first gives fixed-length buffers, so
// timingSafeEqual never throws on a length mismatch and we don't leak length.
function safeEqual(a, b) {
  const ah = crypto.createHash('sha256').update(String(a)).digest()
  const bh = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ah, bh)
}

export function authEnabled() {
  return Boolean(process.env.DASHBOARD_PASSWORD)
}

export function basicAuthGate() {
  if (!authEnabled()) return (req, res, next) => next()

  const user = process.env.DASHBOARD_USER || 'admin'
  const pass = process.env.DASHBOARD_PASSWORD
  const realm = 'Personal Dashboard'

  return (req, res, next) => {
    // CORS preflight carries no credentials, and hosting platforms poll
    // /api/health unauthenticated — both must pass through.
    if (req.method === 'OPTIONS' || req.path === '/api/health') return next()

    const [scheme, encoded] = (req.headers.authorization || '').split(' ')
    if (scheme === 'Basic' && encoded) {
      // Basic auth forbids ':' in the username; the password may contain it.
      const [u, ...rest] = Buffer.from(encoded, 'base64').toString('utf8').split(':')
      if (safeEqual(u, user) && safeEqual(rest.join(':'), pass)) return next()
    }

    res.setHeader('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`)
    return res.status(401).send('Authentication required.')
  }
}
