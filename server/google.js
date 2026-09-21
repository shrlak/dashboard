import crypto from 'node:crypto'
import { getRecord, setRecord, deleteRecord } from './store.js'

// Google accounts are linked dynamically: sign in as many times as you like
// and each Google account becomes its own inbox tab and calendar source.
// The set of linked accounts lives in the `accounts` record; each account's
// OAuth tokens live in `token:<id>`.
//
// An account's id is derived from its email address, so re-authorizing the
// same Google account refreshes it in place instead of creating a duplicate.

const INDEX_KEY = 'accounts'
const tokenKey = (id) => `token:${id}`

// Guard rail: each linked account costs API calls on every refresh.
export const MAX_ACCOUNTS = 8

// Assigned round-robin as accounts are added; shows up as the account's dot
// in the inbox and the colour of its calendar events.
const PALETTE = [
  'var(--accent)',
  'var(--green)',
  'var(--purple)',
  'var(--cyan)',
  'var(--pink)',
  'var(--yellow)',
]

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function accountId(email) {
  return `g${crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 10)}`
}

// "spencer.kim@gmail.com" → "Spencer.kim" — a sensible starting label the
// user can rename from the Connections tab.
function defaultLabel(email) {
  const local = String(email).split('@')[0] || 'Google'
  return local.charAt(0).toUpperCase() + local.slice(1)
}

// Accounts linked before this feature existed used fixed ids. Adopt them on
// first read so an existing deployment keeps its connections.
const LEGACY = [
  { id: 'gmail-personal', label: 'Personal' },
  { id: 'gmail-work', label: 'Work' },
]

async function migrateLegacy() {
  const found = []
  for (const [i, legacy] of LEGACY.entries()) {
    // Old KV deployments stored `dashboard:token:<id>`, which the current
    // prefix + key spells the same way; the old file backend used a bare id.
    const token = (await getRecord(tokenKey(legacy.id))) ?? (await getRecord(legacy.id))
    if (!token?.refresh_token) continue
    const id = token.email ? accountId(token.email) : legacy.id
    await setRecord(tokenKey(id), token)
    found.push({
      id,
      email: token.email ?? null,
      label: legacy.label,
      color: PALETTE[i % PALETTE.length],
      addedAt: Date.now(),
    })
  }
  if (found.length) await setRecord(INDEX_KEY, found)
  return found
}

export async function listAccounts() {
  const saved = await getRecord(INDEX_KEY)
  if (Array.isArray(saved)) return saved
  return migrateLegacy()
}

export async function getAccount(id) {
  return (await listAccounts()).find((a) => a.id === id) ?? null
}

async function saveAccounts(accounts) {
  await setRecord(INDEX_KEY, accounts)
}

export async function renameAccount(id, label) {
  const accounts = await listAccounts()
  const account = accounts.find((a) => a.id === id)
  if (!account) return null
  account.label = String(label).trim().slice(0, 40) || defaultLabel(account.email ?? '')
  await saveAccounts(accounts)
  return account
}

export async function disconnect(id) {
  const accounts = await listAccounts()
  const remaining = accounts.filter((a) => a.id !== id)
  if (remaining.length === accounts.length) return false
  await saveAccounts(remaining)
  await deleteRecord(tokenKey(id))
  return true
}

export function authUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account', // always offer the account chooser
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function tokenRequest(body) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      ...body,
    }),
  })
  if (!res.ok) throw new Error(`Google token endpoint ${res.status}: ${await res.text()}`)
  return res.json()
}

// Completes the OAuth dance and links whichever Google account signed in,
// adding it to the account list (or refreshing it if already linked).
export async function handleCallback(code, redirectUri) {
  const tokens = await tokenRequest({
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const who = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => (r.ok ? r.json() : {}))
  if (!who.email) throw new Error('Google did not return an email address for this account')

  const accounts = await listAccounts()
  const id = accountId(who.email)
  const existing = accounts.find((a) => a.id === id)
  if (!existing && accounts.length >= MAX_ACCOUNTS) {
    throw new Error(`limit of ${MAX_ACCOUNTS} linked Google accounts reached`)
  }

  await setRecord(tokenKey(id), {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expires_at: Date.now() + (tokens.expires_in ?? 0) * 1000,
    email: who.email,
  })

  if (existing) {
    existing.email = who.email
    await saveAccounts(accounts)
    return { ...existing, isNew: false }
  }

  // Pick the first unused palette colour so two accounts never share one.
  const used = new Set(accounts.map((a) => a.color))
  const account = {
    id,
    email: who.email,
    label: defaultLabel(who.email),
    color: PALETTE.find((c) => !used.has(c)) ?? PALETTE[accounts.length % PALETTE.length],
    addedAt: Date.now(),
  }
  await saveAccounts([...accounts, account])
  return { ...account, isNew: true }
}

async function accessTokenFor(id) {
  const saved = await getRecord(tokenKey(id))
  if (!saved?.refresh_token) return null
  if (saved.access_token && saved.expires_at > Date.now() + 60000) return saved.access_token
  const tokens = await tokenRequest({
    refresh_token: saved.refresh_token,
    grant_type: 'refresh_token',
  })
  const next = {
    ...saved,
    access_token: tokens.access_token,
    expires_at: Date.now() + (tokens.expires_in ?? 0) * 1000,
  }
  await setRecord(tokenKey(id), next)
  return next.access_token
}

// Authenticated GET against any Google REST API for the given linked account.
export async function googleGet(id, url) {
  const token = await accessTokenFor(id)
  if (!token) throw new Error(`${id} is not connected`)
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}
