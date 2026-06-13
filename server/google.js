import { getToken, setToken, deleteToken } from './store.js'

// One OAuth "slot" per inbox shown on the dashboard. Each slot stores its
// own refresh token, so personal and work can be different Google accounts.
export const GOOGLE_ACCOUNTS = ['gmail-personal', 'gmail-work']

export const ACCOUNT_META = {
  'gmail-personal': { label: 'Personal', color: 'var(--accent)' },
  'gmail-work': { label: 'Work', color: 'var(--green)' },
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export async function isConnected(account) {
  return Boolean((await getToken(account))?.refresh_token)
}

export async function connectedEmail(account) {
  return (await getToken(account))?.email ?? null
}

// One store read per account, resolved together — handlers use this instead of
// calling the async isConnected/connectedEmail inside Array.filter/map.
export async function connections() {
  const entries = await Promise.all(
    GOOGLE_ACCOUNTS.map(async (account) => {
      const token = await getToken(account)
      return [account, { connected: Boolean(token?.refresh_token), email: token?.email ?? null }]
    })
  )
  return Object.fromEntries(entries)
}

export async function disconnect(account) {
  await deleteToken(account)
}

export function authUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent', // force a refresh token even on re-connects
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

export async function handleCallback(account, code, redirectUri) {
  const tokens = await tokenRequest({
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const who = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => (r.ok ? r.json() : {}))
  await setToken(account, {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expires_at: Date.now() + (tokens.expires_in ?? 0) * 1000,
    email: who.email ?? null,
  })
}

async function accessTokenFor(account) {
  const saved = await getToken(account)
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
  await setToken(account, next)
  return next.access_token
}

// Authenticated GET against any Google REST API for the given account slot.
export async function googleGet(account, url) {
  const token = await accessTokenFor(account)
  if (!token) throw new Error(`${account} is not connected`)
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}
