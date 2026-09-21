import { Router } from 'express'
import { EMAIL_ACCOUNTS, EMAILS } from '../../src/data/mock.js'
import { googleGet, listAccounts } from '../google.js'
import { decodeEntities, shortTime } from '../util.js'

export const emailsRouter = Router()

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me'
const PER_ACCOUNT = 8

function parseSender(from = '') {
  const name = from.replace(/<[^>]*>/g, '').replace(/"/g, '').trim()
  return name || from.replace(/[<>]/g, '')
}

async function fetchInbox(account) {
  const list = await googleGet(account, `${GMAIL}/messages?maxResults=${PER_ACCOUNT}&labelIds=INBOX`)
  const messages = await Promise.all(
    (list.messages ?? []).map((m) =>
      googleGet(
        account,
        `${GMAIL}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`
      )
    )
  )
  return messages.map((m) => {
    const headers = Object.fromEntries(
      (m.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
    )
    const at = +m.internalDate || Date.now()
    return {
      id: `${account}-${m.id}`,
      account,
      sender: parseSender(headers.from),
      subject: headers.subject || '(no subject)',
      snippet: decodeEntities(m.snippet || ''),
      time: shortTime(new Date(at)),
      unread: (m.labelIds ?? []).includes('UNREAD'),
      at,
    }
  })
}

emailsRouter.get('/', async (req, res) => {
  const linked = await listAccounts()
  if (!linked.length) {
    return res.json({ source: 'sample', accounts: EMAIL_ACCOUNTS, emails: EMAILS })
  }
  const accounts = linked.map((a) => ({
    id: a.id,
    label: a.label,
    address: a.email ?? '',
    color: a.color,
  }))
  const results = await Promise.allSettled(linked.map((a) => fetchInbox(a.id)))
  const emails = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => b.at - a.at)
  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason))
  if (errors.length) console.error('Gmail fetch errors:', errors)
  res.json({ source: 'live', accounts, emails, errors })
})
