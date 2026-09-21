import { Router } from 'express'
import { MAX_ACCOUNTS, googleConfigured, listAccounts } from '../google.js'
import { icsUrls } from './calendar.js'

export const integrationsRouter = Router()

// Statuses the Connections tab understands:
//   connected    — live and authenticated
//   ready        — credentials configured, one click to connect
//   needs_setup  — requires configuration on the backend first
//   built_in     — works out of the box, nothing to configure
//   planned      — listed for transparency, not implemented yet
integrationsRouter.get('/', async (req, res) => {
  const hasCreds = googleConfigured()
  const accounts = await listAccounts()
  const feeds = icsUrls()
  const roomLeft = accounts.length < MAX_ACCOUNTS

  // One card per linked Google account: each one contributes both its inbox
  // and its calendars.
  const accountItems = accounts.map((a) => ({
    id: a.id,
    kind: 'google-account',
    icon: '📬',
    category: 'Google accounts',
    name: a.label,
    nameKo: a.email ?? '',
    account: a.id,
    email: a.email,
    color: a.color,
    status: 'connected',
    detail: `${a.email ?? 'Unknown address'} — inbox and calendars are syncing.`,
  }))

  // The card that starts the OAuth flow. Google's account chooser decides
  // which account gets linked, so this works any number of times.
  const addItem = {
    id: 'add-google',
    kind: 'add-google',
    icon: '➕',
    category: 'Google accounts',
    name: accounts.length ? 'Link another Google account' : 'Link a Google account',
    nameKo: '구글 계정 연결',
    status: hasCreds ? (roomLeft ? 'ready' : 'needs_setup') : 'needs_setup',
    detail: !hasCreds
      ? 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend, then reload.'
      : roomLeft
        ? 'Sign in with Google to add its Gmail inbox and calendars. Repeat for as many accounts as you like.'
        : `Limit of ${MAX_ACCOUNTS} linked accounts reached — disconnect one to add another.`,
    connectUrl: '/api/auth/google',
  }

  const items = [
    ...accountItems,
    addItem,
    {
      id: 'icloud-calendar',
      icon: '☁️',
      category: 'Other accounts',
      name: 'iCloud Calendar',
      nameKo: '아이클라우드 캘린더',
      status: feeds.length ? 'connected' : 'needs_setup',
      detail: feeds.length
        ? `${feeds.length} calendar feed${feeds.length > 1 ? 's' : ''} configured via ICLOUD_ICS_URLS`
        : 'In iCloud Calendar, make a calendar public and put its share link(s) in ICLOUD_ICS_URLS (comma-separated).',
    },
    {
      id: 'icloud-mail',
      icon: '📮',
      category: 'Other accounts',
      name: 'iCloud Mail',
      nameKo: '아이클라우드 메일',
      status: 'planned',
      detail: 'Needs an IMAP bridge with an app-specific password — not wired up yet.',
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
      detail: 'Naver Finance via this backend, with frankfurter.app (ECB) as a fallback — no key needed.',
    },
  ]

  res.json({ googleConfigured: hasCreds, maxAccounts: MAX_ACCOUNTS, accounts, items })
})
