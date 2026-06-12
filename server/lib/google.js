import { readJson, writeJson } from './config.js'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

const tokenFile = (accountId) => `google-${accountId}.json`

export function authUrl(google, accountId) {
  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: accountId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function tokenRequest(body) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  if (!res.ok) throw new Error(`token endpoint: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

export async function exchangeCode(google, accountId, code) {
  const data = await tokenRequest({
    code,
    client_id: google.clientId,
    client_secret: google.clientSecret,
    redirect_uri: google.redirectUri,
    grant_type: 'authorization_code',
  })
  const tokens = {
    refresh_token: data.refresh_token,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  writeJson(tokenFile(accountId), tokens)
  return tokens
}

export function isAuthorized(accountId) {
  return !!readJson(tokenFile(accountId))?.refresh_token
}

async function getAccessToken(google, accountId) {
  const tokens = readJson(tokenFile(accountId))
  if (!tokens?.refresh_token) throw new Error(`account "${accountId}" not authorized`)
  if (tokens.access_token && Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token
  }
  const data = await tokenRequest({
    refresh_token: tokens.refresh_token,
    client_id: google.clientId,
    client_secret: google.clientSecret,
    grant_type: 'refresh_token',
  })
  tokens.access_token = data.access_token
  tokens.expires_at = Date.now() + data.expires_in * 1000
  writeJson(tokenFile(accountId), tokens)
  return tokens.access_token
}

export async function gFetch(google, accountId, url) {
  const token = await getAccessToken(google, accountId)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}
