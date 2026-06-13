import { useState } from 'react'

// Manual timezone for the dashboard clock, persisted in the browser so it
// sticks across reloads. Independent of the backend TZ env var (which only
// affects server-formatted calendar/email times). Empty value = follow the
// browser's own timezone.
const KEY = 'dashboard.timezone'

export function systemTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Curated list shown in the picker (IANA zone ids).
export const TIME_ZONES = [
  'UTC',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export function useTimezone() {
  const [stored, setStored] = useState(() => {
    try {
      return localStorage.getItem(KEY) || ''
    } catch {
      return ''
    }
  })

  const setTimezone = (value) => {
    try {
      if (value) localStorage.setItem(KEY, value)
      else localStorage.removeItem(KEY)
    } catch {
      // localStorage unavailable (private mode) — selection just won't persist
    }
    setStored(value)
  }

  return { stored, timeZone: stored || systemTimeZone(), setTimezone }
}
