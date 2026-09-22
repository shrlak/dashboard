// A real login: a signed, HttpOnly session cookie that works both same-origin
// and cross-origin (a GitHub Pages frontend calling this Worker), which HTTP
// Basic auth can't do. Active only when DASHBOARD_PASSWORD is set — otherwise
// the gate is a no-op. Uses the Web Crypto API directly (no node:crypto), so
// no compatibility flag is needed.

import { sha256Bytes, hmacSign, timingSafeEqualStr, timingSafeEqualBytes, b64url, b64urlDecode } from './crypto.js'

const COOKIE = 'dash_session'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const te = new TextEncoder()
const td = new TextDecoder()

export function authRequired(env) {
  return Boolean(env.DASHBOARD_PASSWORD)
}

// Sign with SESSION_SECRET when provided, else derive from the password so a
// single binding is enough to get going. Changing either invalidates sessions.
function secretFor(env) {
  return env.SESSION_SECRET || env.DASHBOARD_PASSWORD || ''
}

export async function checkPassword(env, pw) {
  const expected = env.DASHBOARD_PASSWORD || ''
  if (!expected) return false
  // Hash to fixed length so the compare doesn't leak the password length.
  const a = await sha256Bytes(String(pw ?? ''))
  const b = await sha256Bytes(expected)
  return timingSafeEqualBytes(a, b)
}

export async function issueToken(env) {
  const payload = b64url(te.encode(JSON.stringify({ exp: Date.now() + TTL_MS })))
  const sig = await hmacSign(secretFor(env), payload)
  return `${payload}.${sig}`
}

export async function verifyToken(env, token) {
  if (!token) return false
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig) return false
  const expectedSig = await hmacSign(secretFor(env), payload)
  if (!timingSafeEqualStr(sig, expectedSig)) return false
  try {
    const { exp } = JSON.parse(td.decode(b64urlDecode(payload)))
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

// Tiny cookie reader (the project avoids extra deps — cf. the ICS parser).
function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

export function sessionFromCookieHeader(cookieHeader) {
  return readCookie(cookieHeader, COOKIE)
}

export async function isAuthed(env, cookieHeader) {
  return !authRequired(env) || (await verifyToken(env, sessionFromCookieHeader(cookieHeader)))
}

// SameSite=None + Secure is what lets the cookie ride along on cross-origin
// fetches from a Pages frontend; it also works same-origin.
export function sessionCookieHeader(token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${Math.floor(TTL_MS / 1000)}`
}

export function clearSessionCookieHeader() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`
}

// Paths that must stay open even when a password is set: the login/logout/
// session endpoints (so the login screen can work) and the health check.
export const OPEN_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
])
