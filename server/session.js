import crypto from 'node:crypto'

// A real login: a signed, HttpOnly session cookie that works both same-origin
// (the container serving its own frontend) and cross-origin (a GitHub Pages
// frontend calling this backend), which HTTP Basic auth can't do. Active only
// when DASHBOARD_PASSWORD is set — otherwise the gate is a no-op so local/LAN
// use is unchanged.

const COOKIE = 'dash_session'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function authRequired() {
  return Boolean(process.env.DASHBOARD_PASSWORD)
}

// Sign with SESSION_SECRET when provided, else derive from the password so a
// single env var is enough to get going. Changing either invalidates sessions.
function secret() {
  return process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || ''
}

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url')
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function checkPassword(pw) {
  const expected = process.env.DASHBOARD_PASSWORD || ''
  if (!expected) return false
  // Hash to fixed length so the compare doesn't leak the password length.
  const a = crypto.createHash('sha256').update(String(pw)).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

export function issueToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token) {
  if (!token) return false
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig || !timingSafeEqual(sig, sign(payload))) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

// Tiny cookie reader (the project avoids extra deps — cf. the .env/ICS parsers).
function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

export function sessionFromReq(req) {
  return readCookie(req.headers.cookie, COOKIE)
}

export function isAuthed(req) {
  return !authRequired() || verifyToken(sessionFromReq(req))
}

// SameSite=None + Secure is what lets the cookie ride along on cross-origin
// fetches from a Pages frontend; it also works same-origin.
export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${Math.floor(TTL_MS / 1000)}`
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`)
}

// Gate only the data API (/api/*); the static frontend — including the login
// screen — must load freely. Health and the auth endpoints stay open.
export function sessionGate() {
  const OPEN = new Set([
    '/api/health',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/session',
  ])
  return (req, res, next) => {
    if (!authRequired()) return next()
    if (req.method === 'OPTIONS') return next()
    if (!req.path.startsWith('/api')) return next()
    if (OPEN.has(req.path)) return next()
    if (verifyToken(sessionFromReq(req))) return next()
    return res.status(401).json({ error: 'authentication required' })
  }
}
