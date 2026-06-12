import { Router } from 'express'
import {
  GOOGLE_ACCOUNTS,
  authUrl,
  disconnect,
  googleConfigured,
  handleCallback,
} from '../google.js'

export const authRouter = Router()

// The redirect URI must match what is registered in the Google Cloud
// Console. Behind a reverse proxy or on a hosting platform, set PUBLIC_URL
// (e.g. https://dashboard.example.com) instead of relying on Host headers.
function redirectUri(req) {
  const base = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
  return `${base}/api/auth/google/callback`
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
  res.redirect(authUrl(account, redirectUri(req)))
})

authRouter.get('/google/callback', async (req, res) => {
  const account = String(req.query.state || '')
  if (req.query.error || !req.query.code || !GOOGLE_ACCOUNTS.includes(account)) {
    return res.redirect('/?tab=connections&error=oauth')
  }
  try {
    await handleCallback(account, String(req.query.code), redirectUri(req))
    res.redirect(`/?tab=connections&connected=${account}`)
  } catch (e) {
    console.error('OAuth callback failed:', e.message)
    res.redirect('/?tab=connections&error=oauth')
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
