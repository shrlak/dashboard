import { Router } from 'express'
import { CALENDAR_EVENTS } from '../../src/data/mock.js'
import { GOOGLE_ACCOUNTS, googleGet, isConnected } from '../google.js'
import { parseIcs } from '../ics.js'
import { addDays, dayOffset, humanDuration, startOfDay } from '../util.js'

export const calendarRouter = Router()

const WINDOW_DAYS = 14

export function icsUrls() {
  return (process.env.ICLOUD_ICS_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function mapEvent({ start, end, allDay, title, source, color, id }) {
  return {
    id,
    day: dayOffset(start),
    time: allDay
      ? 'All day'
      : start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    duration: allDay ? '' : humanDuration(end ? end - start : 0),
    title,
    source,
    color,
    startsAt: start.toISOString(),
  }
}

async function googleEvents(account, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const data = await googleGet(
    account,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`
  )
  return (data.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
    .map((e) => {
      const allDay = !e.start.dateTime
      return mapEvent({
        id: `${account}-${e.id}`,
        start: new Date(e.start.dateTime ?? `${e.start.date}T00:00:00`),
        end: e.end ? new Date(e.end.dateTime ?? `${e.end.date}T00:00:00`) : null,
        allDay,
        title: e.summary || '(untitled)',
        source: 'Google',
        color: 'var(--accent)',
      })
    })
}

async function icsEvents(url, index, timeMin, timeMax) {
  const res = await fetch(url.replace(/^webcal:/, 'https:'))
  if (!res.ok) throw new Error(`ICS feed ${res.status}`)
  return parseIcs(await res.text())
    .filter((e) => e.start >= timeMin && e.start < timeMax)
    .map((e, i) =>
      mapEvent({
        id: `ics${index}-${e.uid ?? i}`,
        start: e.start,
        end: e.end ?? null,
        allDay: e.allDay,
        title: e.summary,
        source: 'iCloud',
        color: 'var(--purple)',
      })
    )
}

calendarRouter.get('/', async (req, res) => {
  const connected = GOOGLE_ACCOUNTS.filter(isConnected)
  const feeds = icsUrls()
  if (!connected.length && !feeds.length) {
    return res.json({ source: 'sample', events: CALENDAR_EVENTS })
  }
  const timeMin = startOfDay(new Date())
  const timeMax = addDays(timeMin, WINDOW_DAYS)
  const results = await Promise.allSettled([
    ...connected.map((a) => googleEvents(a, timeMin, timeMax)),
    ...feeds.map((u, i) => icsEvents(u, i, timeMin, timeMax)),
  ])
  const events = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason))
  if (errors.length) console.error('Calendar fetch errors:', errors)
  res.json({ source: 'live', events, errors })
})
