import os from 'node:os'
import { Router } from 'express'
import { GOOGLE_ACCOUNTS, connectedEmail, googleConfigured, isConnected } from '../google.js'
import { icsUrls } from './calendar.js'

export const integrationsRouter = Router()

// Statuses the Connections tab understands:
//   connected    — live and authenticated
//   ready        — credentials configured, one click to connect
//   needs_setup  — requires .env configuration first
//   built_in     — works out of the box, nothing to configure
//   planned      — listed for transparency, not implemented yet
integrationsRouter.get('/', (req, res) => {
  const hasCreds = googleConfigured()
  const connected = GOOGLE_ACCOUNTS.filter(isConnected)
  const feeds = icsUrls()

  const gmailItem = (account, name, nameKo) => ({
    id: account,
    icon: '✉️',
    category: 'Email',
    name,
    nameKo,
    account,
    status: isConnected(account) ? 'connected' : hasCreds ? 'ready' : 'needs_setup',
    detail: isConnected(account)
      ? `Signed in as ${connectedEmail(account) ?? 'unknown'}`
      : hasCreds
        ? 'Sign in with Google to sync this inbox.'
        : 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env, then restart the backend.',
    connectUrl: `/api/auth/google?account=${account}`,
  })

  const items = [
    gmailItem('gmail-personal', 'Gmail — Personal', '지메일 (개인)'),
    gmailItem('gmail-work', 'Gmail — Work', '지메일 (업무)'),
    {
      id: 'icloud-mail',
      icon: '📮',
      category: 'Email',
      name: 'iCloud Mail',
      nameKo: '아이클라우드 메일',
      status: 'planned',
      detail: 'Needs an IMAP bridge with an app-specific password — not wired up yet.',
    },
    {
      id: 'google-calendar',
      icon: '📅',
      category: 'Calendar',
      name: 'Google Calendar',
      nameKo: '구글 캘린더',
      status: connected.length ? 'connected' : hasCreds ? 'ready' : 'needs_setup',
      detail: connected.length
        ? `Syncing all visible calendars of ${connected.map((a) => connectedEmail(a)).filter(Boolean).join(', ')}`
        : 'Comes with the Gmail sign-in above — connecting either inbox also syncs its calendars.',
    },
    {
      id: 'icloud-calendar',
      icon: '☁️',
      category: 'Calendar',
      name: 'iCloud Calendar',
      nameKo: '아이클라우드 캘린더',
      status: feeds.length ? 'connected' : 'needs_setup',
      detail: feeds.length
        ? `${feeds.length} calendar feed${feeds.length > 1 ? 's' : ''} configured via ICLOUD_ICS_URLS`
        : 'In iCloud Calendar, make a calendar public and put its share link(s) in ICLOUD_ICS_URLS (comma-separated).',
    },
    {
      id: 'news',
      icon: '📰',
      category: 'Feeds',
      name: 'News briefing',
      nameKo: '뉴스 브리핑',
      status: 'built_in',
      detail: 'Google News RSS (한국어 + English), no key needed. Override with NEWS_FEEDS_KO / NEWS_FEEDS_EN.',
    },
    {
      id: 'fx',
      icon: '💱',
      category: 'Feeds',
      name: 'KRW/USD rate',
      nameKo: '환율',
      status: 'built_in',
      detail: 'frankfurter.app ECB reference rates, fetched directly by your browser — no key needed.',
    },
    {
      id: 'system',
      icon: '💻',
      category: 'System',
      name: 'System health',
      nameKo: '시스템 상태',
      status: 'built_in',
      detail: `Real CPU, memory, disk and network stats from the machine running this backend (${os.hostname()}).`,
    },
  ]

  res.json({ googleConfigured: hasCreds, items })
})
