// Minimal ICS (RFC 5545) parser — enough to read events out of an iCloud
// "public calendar" share link. Recurring events are returned once with
// `recurring: true` (occurrences are not expanded), and TZID-localized
// times are treated as server-local — set TZ in .env to your timezone.

function parseIcsDate(value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0', s = '0', z] = m
  if (z) return new Date(Date.UTC(+y, mo - 1, +d, +h, +mi, +s))
  return new Date(+y, mo - 1, +d, +h, +mi, +s)
}

function unescapeText(value) {
  return value.replace(/\\([\\,;nN])/g, (_, c) => (c.toLowerCase() === 'n' ? ' ' : c))
}

export function parseIcs(text) {
  // Unfold continuation lines (CRLF followed by a space or tab).
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const events = []
  let cur = null
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur?.start && cur.summary) events.push(cur)
      cur = null
      continue
    }
    if (!cur) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const name = line.slice(0, idx).split(';')[0]
    const value = line.slice(idx + 1)
    if (name === 'SUMMARY') cur.summary = unescapeText(value)
    else if (name === 'UID') cur.uid = value
    else if (name === 'RRULE') cur.recurring = true
    else if (name === 'DTSTART') {
      cur.start = parseIcsDate(value)
      cur.allDay = !value.includes('T')
    } else if (name === 'DTEND') cur.end = parseIcsDate(value)
  }
  return events
}
