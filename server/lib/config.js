import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const SERVER_DIR = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(SERVER_DIR, '.data')

const DEFAULTS = {
  google: {
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:8787/auth/google/callback',
  },
  // Each entry is one Google account shown in the inbox/calendar.
  // Authorize each at http://localhost:8787/auth/google/<id> after
  // filling in clientId/clientSecret.
  googleAccounts: [
    { id: 'gmail-personal', label: 'Personal', address: 'spencerkim1235@gmail.com', color: 'var(--accent)' },
    { id: 'gmail-work', label: 'Work', address: '', color: 'var(--green)' },
  ],
  icloud: {
    label: 'iCloud',
    color: 'var(--purple)',
    address: '', // e.g. you@icloud.com
    appPassword: '', // app-specific password from appleid.apple.com
  },
  // iCloud calendar sharing links (webcal://...) — public or private.
  icloudCalendarUrls: [],
  newsFeeds: [
    { url: 'https://www.yna.co.kr/rss/news.xml', source: '연합뉴스', lang: 'ko', category: '종합' },
    { url: 'https://www.mk.co.kr/rss/30000001/', source: '매일경제', lang: 'ko', category: '경제' },
    { url: 'https://www.khan.co.kr/rss/rssdata/total_news.xml', source: '경향신문', lang: 'ko', category: '종합' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', lang: 'en', category: 'World' },
    { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian', lang: 'en', category: 'World' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', source: 'NYT', lang: 'en', category: 'Tech' },
  ],
}

export function loadConfig() {
  let user = {}
  const file = path.join(SERVER_DIR, 'config.json')
  if (fs.existsSync(file)) {
    try {
      user = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      console.warn(`[config] could not parse ${file}: ${e.message}`)
    }
  }
  const cfg = {
    ...DEFAULTS,
    ...user,
    google: { ...DEFAULTS.google, ...user.google },
    icloud: { ...DEFAULTS.icloud, ...user.icloud },
  }
  // Env vars override the file so secrets can live outside the repo.
  if (process.env.GOOGLE_CLIENT_ID) cfg.google.clientId = process.env.GOOGLE_CLIENT_ID
  if (process.env.GOOGLE_CLIENT_SECRET) cfg.google.clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (process.env.ICLOUD_ADDRESS) cfg.icloud.address = process.env.ICLOUD_ADDRESS
  if (process.env.ICLOUD_APP_PASSWORD) cfg.icloud.appPassword = process.env.ICLOUD_APP_PASSWORD
  return cfg
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
  } catch {
    return fallback
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2))
}
