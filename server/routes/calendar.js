import { Router } from 'express'
import { CALENDAR_EVENTS } from '../../src/data/mock.js'
import { GOOGLE_ACCOUNTS, connections, googleGet } from '../google.js'
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

function mapEvent({ start, end, allDay, title, source, color, id, calendar = null }) {
  return {
    id,
    day: dayOffset(start),
    time: allDay
      ? 'All day'
      : start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    duration: allDay ? '' : humanDuration(end ? end - start : 0),
    title,
    source,
    calendar,
    color,
    startsAt: start.toISOString(),
  }
}

// All calendars the account has chosen to show (primary + the secondary /
// shared ones ticked in Google Calendar), not just the primary calendar.
async function googleCalendars(account) {
  try {
    const data = await googleGet(
      account,
      'https://www.googleapis.com/calendar/v3/users/me/calendarList' +
        '?fields=items(id,summary,primary,selected,backgroundColor)&minAccessRole=reader'
    )
    const cals = (data.items ?? []).filter((c) => c.primary || c.selected)
    if (cals.length) return cals
  } catch (e) {
    console.error(`calendarList(${account}) failed:`, e.message)
  }
  // Fall back to just the primary calendar so the panel still works.
  return [{ id: 'primary', primary: true }]
}

async function googleEvents(account, cal, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const data = await googleGet(
    account,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`
  )
  return (data.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
    .map((e) => {
      const allDay = !e.start.dateTime
      return mapEvent({
        id: `${account}-${cal.id}-${e.id}`,
        start: new Date(e.start.dateTime ?? `${e.start.date}T00:00:00`),
        end: e.end ? new Date(e.end.dateTime ?? `${e.end.date}T00:00:00`) : null,
        allDay,
        title: e.summary || '(untitled)',
        source: 'Google',
        // Name the non-primary calendar so the agenda can label it.
        calendar: cal.primary ? null : cal.summary || null,
        color: cal.backgroundColor || 'var(--accent)',
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
  const conns = await connections()
  const connected = GOOGLE_ACCOUNTS.filter((a) => conns[a].connected)
  const feeds = icsUrls()
  if (!connected.length && !feeds.length) {
    return res.json({ source: 'sample', events: CALENDAR_EVENTS })
  }
  const timeMin = startOfDay(new Date())
  const timeMax = addDays(timeMin, WINDOW_DAYS)

  // Expand each connected account into its visible calendars first, then fetch
  // events from every calendar (primary + secondary) in parallel.
  const calLists = await Promise.allSettled(
    connected.map(async (a) => ({ account: a, cals: await googleCalendars(a) }))
  )
  const googleJobs = calLists.flatMap((r) =>
    r.status === 'fulfilled'
      ? r.value.cals.map((cal) => googleEvents(r.value.account, cal, timeMin, timeMax))
      : []
  )

  const results = await Promise.allSettled([
    ...googleJobs,
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
