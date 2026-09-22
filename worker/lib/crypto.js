// Web Crypto helpers shared by session signing and account-id hashing.
// Pure Fetch-API/Web Crypto — no Node builtins, so no compat flag needed.

const te = new TextEncoder()
const td = new TextDecoder()

export function b64url(bytes) {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const bin = atob(padded + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function encodeJsonState(obj) {
  return b64url(te.encode(JSON.stringify(obj)))
}

export function decodeJsonState(raw) {
  try {
    return JSON.parse(td.decode(b64urlDecode(String(raw))))
  } catch {
    return {}
  }
}

export async function sha256Bytes(str) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(str)))
}

export async function sha256Hex(str) {
  return [...(await sha256Bytes(str))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    te.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(data))
  return b64url(sig)
}

// Constant-time-ish compare — both inputs are fixed-length (hashes or
// signatures), which is what makes this a meaningful timing defense.
export function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
