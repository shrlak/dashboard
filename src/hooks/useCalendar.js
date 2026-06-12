import { usePolledApi } from '../lib/api.js'
import { CALENDAR_EVENTS } from '../data/mock.js'

const FALLBACK = { events: CALENDAR_EVENTS }

export function useCalendar() {
  const { isLive, data } = usePolledApi('/api/calendar', 5 * 60_000, FALLBACK)
  return { isLive, events: data.events }
}
