import fs from 'node:fs'
import path from 'node:path'

// Minimal .env loader so the server needs no dotenv dependency.
// Real environment variables always win over values from the file.
export function loadEnv(file = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    const [, key, raw] = m
    if (process.env[key] !== undefined) continue
    process.env[key] = raw.replace(/^(["'])(.*)\1$/, '$2')
  }
}
