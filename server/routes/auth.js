import { Router } from 'express'
import { authUrl, exchangeCode, isAuthorized } from '../lib/google.js'

const router = Router()

router.get('/google/callback', async (req, res) => {
  const { code, state: accountId, error } = req.query
  if (error || !code) return res.status(400).send(`Authorization failed: ${error || 'no code'}`)
  try {
    await exchangeCode(req.app.locals.config.google, accountId, code)
    res.send(
      `<body style="font-family:sans-serif;background:#0b0e14;color:#e6e9f0;display:grid;place-items:center;height:100vh">
        <div>✅ Google account <b>${accountId}</b> connected. You can close this tab.</div>
      </body>`,
    )
  } catch (e) {
    res.status(500).send(`Token exchange failed: ${e.message}`)
  }
})

router.get('/google/:accountId', (req, res) => {
  const { google, googleAccounts } = req.app.locals.config
  if (!google.clientId || !google.clientSecret) {
    return res
      .status(400)
      .send('Set google.clientId / clientSecret in server/config.json first (see README).')
  }
  const { accountId } = req.params
  if (!googleAccounts.some((a) => a.id === accountId)) {
    return res.status(404).send(`Unknown account "${accountId}" — add it to googleAccounts in server/config.json.`)
  }
  res.redirect(authUrl(google, accountId))
})

router.get('/status', (req, res) => {
  const { googleAccounts, icloud, icloudCalendarUrls } = req.app.locals.config
  res.json({
    google: googleAccounts
      .filter((a) => a.address)
      .map((a) => ({ id: a.id, address: a.address, authorized: isAuthorized(a.id) })),
    icloudMail: !!(icloud.address && icloud.appPassword),
    icloudCalendar: icloudCalendarUrls.length > 0,
  })
})

export default router
