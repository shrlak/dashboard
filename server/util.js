// Shared formatting helpers for the API routes. The frontend panels were
// built around the shapes in src/data/mock.js, so everything here formats
// live data into those same shapes.

export function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Offset in whole local days from today (0 = today, 1 = tomorrow…).
export function dayOffset(date, now = new Date()) {
  return Math.round((startOfDay(date) - startOfDay(now)) / 86400000)
}

// "17:02" if today, "Wed" within a week, "Jun 3" otherwise — matches the
// time strings the email panel was designed around.
export function shortTime(date, now = new Date()) {
  if (Number.isNaN(date?.getTime?.())) return ''
  if (startOfDay(date).getTime() === startOfDay(now).getTime()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  if (now - date < 7 * 86400000) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// 5400000 → "1h 30m", 1800000 → "30m"
export function humanDuration(ms) {
  if (!ms || ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

// Relative time in the language of the news feed: "40m ago" / "40분 전"
export function relativeTime(date, lang, now = new Date()) {
  const mins = Math.max(1, Math.round((now - date) / 60000))
  if (mins < 60) return lang === 'ko' ? `${mins}분 전` : `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return lang === 'ko' ? `${hours}시간 전` : `${hours}h ago`
  const days = Math.round(hours / 24)
  return lang === 'ko' ? `${days}일 전` : `${days}d ago`
}
