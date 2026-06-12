import { Router } from 'express'
import { ImapFlow } from 'imapflow'
import { gFetch, isAuthorized } from '../lib/google.js'
import { cached } from '../lib/cache.js'

const router = Router()
const PER_ACCOUNT = 10

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  if (now - d < 6 * 86400000) {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

function parseFromHeader(value = '') {
  const m = value.match(/^\s*"?([^"<]*)"?\s*<.*>$/)
  return (m ? m[1].trim() : value.trim()) || value
}

async function fetchGmail(google, account) {
  const base = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const list = await gFetch(google, account.id, `${base}/messages?maxResults=${PER_ACCOUNT}&labelIds=INBOX`)
  const messages = await Promise.all(
    (list.messages ?? []).map((m) =>
      gFetch(
        google,
        account.id,
        `${base}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ),
  )
  return messages.map((m) => {
    const header = (name) => m.payload.headers.find((h) => h.name.toLowerCase() === name)?.value ?? ''
    const ts = Number(m.internalDate)
    return {
      id: `${account.id}-${m.id}`,
      account: account.id,
      sender: parseFromHeader(header('from')),
      subject: header('subject') || '(no subject)',
      snippet: m.snippet ?? '',
      unread: m.labelIds?.includes('UNREAD') ?? false,
      ts,
      time: formatTime(ts),
    }
  })
}

async function fetchIcloud(icloud) {
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: icloud.address, pass: icloud.appPassword },
    logger: false,
  })
  const out = []
  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const total = client.mailbox.exists
      if (total > 0) {
        const from = Math.max(1, total - PER_ACCOUNT + 1)
        for await (const msg of client.fetch(`${from}:*`, {
          envelope: true,
          flags: true,
          internalDate: true,
        })) {
          const sender = msg.envelope.from?.[0]
          const ts = msg.internalDate?.getTime() ?? Date.now()
          out.push({
            id: `icloud-${msg.uid}`,
            account: 'icloud',
            sender: sender?.name || sender?.address || 'Unknown',
            subject: msg.envelope.subject || '(no subject)',
            snippet: '',
            unread: !msg.flags.has('\\Seen'),
            ts,
            time: formatTime(ts),
          })
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }
  return out
}

router.get('/', async (req, res) => {
  const { google, googleAccounts, icloud } = req.app.locals.config

  const sources = []
  const accounts = []

  for (const acc of googleAccounts) {
    if (!acc.address || !isAuthorized(acc.id)) continue
    accounts.push({ id: acc.id, label: acc.label, address: acc.address, color: acc.color })
    sources.push(fetchGmail(google, acc))
  }
  if (icloud.address && icloud.appPassword) {
    accounts.push({ id: 'icloud', label: icloud.label, address: icloud.address, color: icloud.color })
    sources.push(fetchIcloud(icloud))
  }

  if (!sources.length) return res.json({ configured: false, accounts: [], emails: [] })

  try {
    const emails = await cached('emails', 60_000, async () => {
      const settled = await Promise.allSettled(sources)
      for (const s of settled) {
        if (s.status === 'rejected') console.warn('[emails]', s.reason?.message ?? s.reason)
      }
      return settled
        .flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 30)
    })
    res.json({ configured: true, accounts, emails })
  } catch (e) {
    res.status(500).json({ configured: true, error: e.message, accounts, emails: [] })
  }
})

export default router
