import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// OAuth tokens are persisted one of two ways:
//   • A Redis KV store (Upstash / Vercel KV) when its REST env vars are set —
//     required on serverless hosts (Vercel) that have no persistent disk.
//   • Otherwise a local gitignored JSON file (DATA_DIR/tokens.json) — used for
//     local dev and any host with a writable disk.
// The API is async so either backend works behind the same calls.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const useKv = Boolean(KV_URL && KV_TOKEN)
const KV_PREFIX = 'dashboard:token:'

const DATA_DIR =
  process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '.data')
const FILE = path.join(DATA_DIR, 'tokens.json')

// --- Redis REST (Upstash / Vercel KV) ---
async function kv(command) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`KV ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).result
}

// --- Local JSON file ---
function readFile() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    return {}
  }
}

function writeFile(all) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2), { mode: 0o600 })
}

export async function getToken(key) {
  if (useKv) {
    const raw = await kv(['GET', KV_PREFIX + key])
    return raw ? JSON.parse(raw) : null
  }
  return readFile()[key] ?? null
}

export async function setToken(key, value) {
  if (useKv) {
    await kv(['SET', KV_PREFIX + key, JSON.stringify(value)])
    return
  }
  const all = readFile()
  all[key] = value
  writeFile(all)
}

export async function deleteToken(key) {
  if (useKv) {
    await kv(['DEL', KV_PREFIX + key])
    return
  }
  const all = readFile()
  delete all[key]
  writeFile(all)
}
