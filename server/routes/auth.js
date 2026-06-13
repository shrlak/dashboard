import { Router } from 'express'
import {
  GOOGLE_ACCOUNTS,
  authUrl,
  disconnect,
  googleConfigured,
  handleCallback,
} from '../google.js'
import { allowedOrigins } from '../util.js'
import {
  authRequired,
  checkPassword,
  clearSessionCookie,
  isAuthed,
  issueToken,
  setSessionCookie,
} from '../session.js'

export const authRouter = Router()

// --- Dashboard login (master password) ---------------------------------
// The browser/SPA calls these to establish a session cookie; see session.js.

authRouter.get('/session', (req, res) => {
  res.json({ required: authRequired(), authed: isAuthed(req) })
})

authRouter.post('/login', (req, res) => {
  if (!authRequired()) return res.json({ authed: true })
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password.' })
  }
  setSessionCookie(res, issueToken())
  res.json({ authed: true })
})

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

// Behind a reverse proxy or on a hosting platform, set PUBLIC_URL
// (e.g. https://dashboard.example.com) instead of relying on Host headers.
function selfOrigin(req) {
  return new URL(process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).origin
}

// Must match what is registered in the Google Cloud Console.
function redirectUri(req) {
  return `${selfOrigin(req)}/api/auth/google/callback`
}

// The frontend may live on another origin (GitHub Pages); it passes where
// to send the browser after OAuth via ?return=. Only the backend's own
// origin and ALLOWED_ORIGINS qualify — anything else is dropped.
function safeReturnTo(raw, req) {
  if (!raw) return null
  try {
    const url = new URL(String(raw))
    const ok = [selfOrigin(req), ...allowedOrigins()]
    if (['http:', 'https:'].includes(url.protocol) && ok.includes(url.origin)) return url
  } catch {
    // not a valid absolute URL
  }
  return null
}

const encodeState = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

function decodeState(raw) {
  try {
    return JSON.parse(Buffer.from(String(raw), 'base64url').toString())
  } catch {
    return {}
  }
}

function frontendRedirect(returnTo, params) {
  if (!returnTo) return `/?${new URLSearchParams(params)}`
  const url = new URL(returnTo)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

authRouter.get('/google', (req, res) => {
  if (!googleConfigured()) {
    return res
      .status(400)
      .json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.' })
  }
  const account = String(req.query.account || '')
  if (!GOOGLE_ACCOUNTS.includes(account)) {
    return res.status(400).json({ error: `account must be one of: ${GOOGLE_ACCOUNTS.join(', ')}` })
  }
  const returnTo = safeReturnTo(req.query.return, req)
  const state = encodeState({ account, return: returnTo ? returnTo.toString() : null })
  res.redirect(authUrl(redirectUri(req), state))
})

authRouter.get('/google/callback', async (req, res) => {
  const state = decodeState(req.query.state)
  const account = GOOGLE_ACCOUNTS.includes(state.account) ? state.account : null
  const returnTo = safeReturnTo(state.return, req)
  if (req.query.error || !req.query.code || !account) {
    return res.redirect(frontendRedirect(returnTo, { tab: 'connections', error: 'oauth' }))
  }
  try {
    await handleCallback(account, String(req.query.code), redirectUri(req))
    res.redirect(frontendRedirect(returnTo, { tab: 'connections', connected: account }))
  } catch (e) {
    console.error('OAuth callback failed:', e.message)
    res.redirect(frontendRedirect(returnTo, { tab: 'connections', error: 'oauth' }))
  }
})

authRouter.post('/google/disconnect', (req, res) => {
  const account = String(req.body?.account || '')
  if (!GOOGLE_ACCOUNTS.includes(account)) {
    return res.status(400).json({ error: 'unknown account' })
  }
  disconnect(account)
  res.json({ ok: true })
})
