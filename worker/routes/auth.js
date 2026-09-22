import { Hono } from 'hono'
import {
  MAX_ACCOUNTS,
  authUrl,
  disconnect,
  googleConfigured,
  handleCallback,
  listAccounts,
  renameAccount,
} from '../lib/google.js'
import { allowedOrigins } from '../lib/util.js'
import {
  authRequired,
  checkPassword,
  isAuthed,
  issueToken,
  sessionCookieHeader,
  clearSessionCookieHeader,
} from '../lib/session.js'
import { encodeJsonState, decodeJsonState } from '../lib/crypto.js'

export const authRoutes = new Hono()

// --- Dashboard login (master password) ---------------------------------
// The browser/SPA calls these to establish a session cookie; see session.js.

authRoutes.get('/session', async (c) => {
  const authed = await isAuthed(c.env, c.req.header('cookie'))
  return c.json({ required: authRequired(c.env), authed })
})

authRoutes.post('/login', async (c) => {
  if (!authRequired(c.env)) return c.json({ authed: true })
  const body = await c.req.json().catch(() => ({}))
  if (!(await checkPassword(c.env, body?.password))) {
    return c.json({ error: 'Incorrect password.' }, 401)
  }
  c.header('Set-Cookie', sessionCookieHeader(await issueToken(c.env)))
  return c.json({ authed: true })
})

authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', clearSessionCookieHeader())
  return c.json({ ok: true })
})

// Behind a custom domain / proxy, set PUBLIC_URL instead of relying on the
// request's own origin (which Cloudflare otherwise reports correctly).
function selfOrigin(c) {
  return new URL(c.env.PUBLIC_URL || c.req.url).origin
}

// Must match what is registered in the Google Cloud Console.
function redirectUri(c) {
  return `${selfOrigin(c)}/api/auth/google/callback`
}

// The frontend may live on another origin (GitHub Pages); it passes where
// to send the browser after OAuth via ?return=. Only the backend's own
// origin and ALLOWED_ORIGINS qualify — anything else is dropped.
function safeReturnTo(raw, c) {
  if (!raw) return null
  try {
    const url = new URL(String(raw))
    const ok = [selfOrigin(c), ...allowedOrigins(c.env)]
    if (['http:', 'https:'].includes(url.protocol) && ok.includes(url.origin)) return url
  } catch {
    // not a valid absolute URL
  }
  return null
}

function frontendRedirect(returnTo, params) {
  if (!returnTo) return `/?${new URLSearchParams(params)}`
  const url = new URL(returnTo)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

// Starts linking a Google account. Whichever account the user picks in
// Google's chooser is the one that gets linked — sign in repeatedly to add
// as many as you like.
authRoutes.get('/google', async (c) => {
  if (!googleConfigured(c.env)) {
    return c.json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend first.' }, 400)
  }
  const returnTo = safeReturnTo(c.req.query('return'), c)
  if ((await listAccounts(c.env)).length >= MAX_ACCOUNTS) {
    return c.redirect(frontendRedirect(returnTo, { tab: 'connections', error: 'limit' }))
  }
  const state = encodeJsonState({ return: returnTo ? returnTo.toString() : null })
  return c.redirect(authUrl(c.env, redirectUri(c), state))
})

authRoutes.get('/google/callback', async (c) => {
  const state = decodeJsonState(c.req.query('state'))
  const returnTo = safeReturnTo(state.return, c)
  const code = c.req.query('code')
  if (c.req.query('error') || !code) {
    return c.redirect(frontendRedirect(returnTo, { tab: 'connections', error: 'oauth' }))
  }
  try {
    const account = await handleCallback(c.env, code, redirectUri(c))
    return c.redirect(
      frontendRedirect(returnTo, { tab: 'connections', connected: account.email ?? account.id })
    )
  } catch (e) {
    console.error('OAuth callback failed:', e.message)
    return c.redirect(frontendRedirect(returnTo, { tab: 'connections', error: 'oauth' }))
  }
})

authRoutes.post('/google/disconnect', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const account = String(body?.account || '')
  if (!(await disconnect(c.env, account))) {
    return c.json({ error: 'unknown account' }, 404)
  }
  return c.json({ ok: true })
})

// Rename an inbox tab — purely cosmetic, so two accounts can be told apart.
authRoutes.post('/google/rename', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const account = String(body?.account || '')
  const label = String(body?.label ?? '')
  const updated = await renameAccount(c.env, account, label)
  if (!updated) return c.json({ error: 'unknown account' }, 404)
  return c.json({ ok: true, account: updated })
})
