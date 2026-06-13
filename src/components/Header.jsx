import { useClock } from '../hooks/useClock.js'
import { TIME_ZONES, systemTimeZone, useTimezone } from '../hooks/useTimezone.js'

const TABS = [
  { id: 'overview', label: 'Overview', ko: '대시보드' },
  { id: 'connections', label: 'Connections', ko: '연결 · 연동' },
]

// Hour 0–23 in the chosen timezone (for the greeting), regardless of the
// browser's own timezone.
function hourIn(date, timeZone) {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(date)
  )
}

function zoneLabel(date, timeZone) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? timeZone
}

export default function Header({ tab, onTabChange }) {
  const now = useClock()
  const { stored, timeZone, setTimezone } = useTimezone()

  const hour = hourIn(now, timeZone)
  const greeting =
    hour < 6 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greetingKo = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요'

  const time = now.toLocaleTimeString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const dateEn = now.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const dateKo = now.toLocaleDateString('ko-KR', {
    timeZone,
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <header className="header">
      <div>
        <h1>
          {greeting}, Spencer <span aria-hidden>👋</span>
        </h1>
        <div className="subtitle">{greetingKo} · 오늘도 좋은 하루 보내세요</div>
      </div>
      <nav className="main-tabs" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`main-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label} <span className="ko">{t.ko}</span>
          </button>
        ))}
      </nav>
      <div className="clock">
        <div className="time">{time}</div>
        <div className="date">
          {dateEn} · {dateKo}
        </div>
        <label className="tz-picker">
          <span aria-hidden>🌐</span>
          <select
            className="tz-select"
            value={stored}
            onChange={(e) => setTimezone(e.target.value)}
            aria-label="Time zone"
          >
            <option value="">System · {systemTimeZone()}</option>
            {TIME_ZONES.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className="tz-abbr">{zoneLabel(now, timeZone)}</span>
        </label>
      </div>
    </header>
  )
}
