import { Router } from 'express'
import ical from 'node-ical'
import { gFetch, isAuthorized } from '../lib/google.js'
import { cached } from '../lib/cache.js'

const router = Router()
const WINDOW_DAYS = 14

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

function dayOffset(date) {
  return Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000)
}

function formatDuration(start, end) {
  if (!end) return ''
  const mins = Math.round((end - start) / 60000)
  if (mins <= 0 || mins >= 24 * 60) return ''
  if (mins < 60) return `${mins}m`
  const h = mins / 60
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}

function toEvent(id, title, start, end, allDay, source, color) {
  const day = dayOffset(start)
  if (day < 0 || day >= WINDOW_DAYS) return null
  return {
    id,
    day,
    allDay,
    time: allDay
      ? 'All day'
      : start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    duration: allDay ? '' : formatDuration(start, end),
    title,
    source,
    color,
    ts: start.getTime(),
  }
}

async function fetchGoogleCalendar(google, account) {
  const timeMin = startOfDay(new Date()).toISOString()
  const timeMax = new Date(Date.now() + WINDOW_DAYS * 86400000).toISOString()
  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
    new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '50' })
  const data = await gFetch(google, account.id, url)
  return (data.items ?? [])
    .map((e) => {
      const allDay = !!e.start?.date
      const start = new Date(e.start?.dateTime ?? `${e.start?.date}T00:00:00`)
      const end = e.end?.dateTime ? new Date(e.end.dateTime) : null
      return toEvent(`g-${account.id}-${e.id}`, e.summary ?? '(untitled)', start, end, allDay, 'Google', account.color)
    })
    .filter(Boolean)
}

async function fetchIcsCalendar(url, color) {
  const httpsUrl = url.replace(/^webcal:/, 'https:')
  const data = await ical.async.fromURL(httpsUrl)
  const now = new Date()
  const windowEnd = new Date(Date.now() + WINDOW_DAYS * 86400000)
  const out = []

  for (const ev of Object.values(data)) {
    if (ev.type !== 'VEVENT') continue
    const durationMs = ev.end && ev.start ? ev.end - ev.start : 0
    const allDay = ev.datetype === 'date'

    if (ev.rrule) {
      for (const occ of ev.rrule.between(startOfDay(now), windowEnd, true)) {
        out.push(
          toEvent(`i-${ev.uid}-${occ.getTime()}`, ev.summary, occ, new Date(occ.getTime() + durationMs), allDay, 'iCloud', color),
        )
      }
    } else if (ev.start) {
      out.push(toEvent(`i-${ev.uid}`, ev.summary, ev.start, ev.end, allDay, 'iCloud', color))
    }
  }
  return out.filter(Boolean)
}

router.get('/', async (req, res) => {
  const { google, googleAccounts, icloud, icloudCalendarUrls } = req.app.locals.config

  const sources = []
  for (const acc of googleAccounts) {
    if (acc.address && isAuthorized(acc.id)) sources.push(fetchGoogleCalendar(google, acc))
  }
  for (const url of icloudCalendarUrls) sources.push(fetchIcsCalendar(url, icloud.color))

  if (!sources.length) return res.json({ configured: false, events: [] })

  try {
    const events = await cached('calendar', 5 * 60_000, async () => {
      const settled = await Promise.allSettled(sources)
      for (const s of settled) {
        if (s.status === 'rejected') console.warn('[calendar]', s.reason?.message ?? s.reason)
      }
      return settled
        .flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
        .sort((a, b) => a.ts - b.ts)
        .slice(0, 40)
    })
    res.json({ configured: true, events })
  } catch (e) {
    res.status(500).json({ configured: true, error: e.message, events: [] })
  }
})

export default router
