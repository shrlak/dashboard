import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// OAuth tokens live in a gitignored JSON file next to the server code.
// Set DATA_DIR to put it somewhere else (e.g. a mounted volume in Docker).
const DATA_DIR =
  process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '.data')
const FILE = path.join(DATA_DIR, 'tokens.json')

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    return {}
  }
}

function writeAll(all) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2), { mode: 0o600 })
}

export function getToken(key) {
  return readAll()[key] ?? null
}

export function setToken(key, value) {
  const all = readAll()
  all[key] = value
  writeAll(all)
}

export function deleteToken(key) {
  const all = readAll()
  delete all[key]
  writeAll(all)
}
