import { Hono } from 'hono'
import { CALENDAR_EVENTS } from '../../src/data/mock.js'
import { googleGet, listAccounts } from '../lib/google.js'
import { parseIcs } from '../lib/ics.js'
import { addDays, dayOffset, humanDuration, startOfDay } from '../lib/util.js'

export const calendarRoutes = new Hono()

const WINDOW_DAYS = 14

export function icsUrls(env) {
  return (env.ICLOUD_ICS_URLS || '')
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
async function googleCalendars(env, account) {
  try {
    const data = await googleGet(
      env,
      account.id,
      'https://www.googleapis.com/calendar/v3/users/me/calendarList' +
        '?fields=items(id,summary,primary,selected,backgroundColor)&minAccessRole=reader'
    )
    const cals = (data.items ?? []).filter((c) => c.primary || c.selected)
    if (cals.length) return cals
  } catch (e) {
    console.error(`calendarList(${account.email ?? account.id}) failed:`, e.message)
  }
  // Fall back to just the primary calendar so the panel still works.
  return [{ id: 'primary', primary: true }]
}

async function googleEvents(env, account, cal, timeMin, timeMax, multiAccount) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const data = await googleGet(
    env,
    account.id,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`
  )
  return (data.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
    .map((e) => {
      const allDay = !e.start.dateTime
      return mapEvent({
        id: `${account.id}-${cal.id}-${e.id}`,
        start: new Date(e.start.dateTime ?? `${e.start.date}T00:00:00`),
        end: e.end ? new Date(e.end.dateTime ?? `${e.end.date}T00:00:00`) : null,
        allDay,
        title: e.summary || '(untitled)',
        source: 'Google',
        // Label the event with its calendar — or, for a primary calendar when
        // several Google accounts are linked, with the account it came from.
        calendar: cal.primary ? (multiAccount ? account.label : null) : cal.summary || null,
        color: cal.backgroundColor || account.color,
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

calendarRoutes.get('/', async (c) => {
  const linked = await listAccounts(c.env)
  const feeds = icsUrls(c.env)
  if (!linked.length && !feeds.length) {
    return c.json({ source: 'sample', events: CALENDAR_EVENTS })
  }
  const timeMin = startOfDay(new Date())
  const timeMax = addDays(timeMin, WINDOW_DAYS)
  const multiAccount = linked.length > 1

  // Expand each linked account into its visible calendars first, then fetch
  // events from every calendar (primary + secondary) in parallel.
  const calLists = await Promise.allSettled(
    linked.map(async (a) => ({ account: a, cals: await googleCalendars(c.env, a) }))
  )
  const googleJobs = calLists.flatMap((r) =>
    r.status === 'fulfilled'
      ? r.value.cals.map((cal) =>
          googleEvents(c.env, r.value.account, cal, timeMin, timeMax, multiAccount)
        )
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
  return c.json({ source: 'live', events, errors })
})
