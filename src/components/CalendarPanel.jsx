import { useMemo } from 'react'
import Panel from './Panel.jsx'
import { useApi } from '../hooks/useApi.js'
import { CALENDAR_EVENTS } from '../data/mock.js'

const FALLBACK = { source: 'sample', events: CALENDAR_EVENTS }

function monthGrid(today) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay()) // back up to Sunday

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push(d)
  }
  // Drop a trailing all-other-month week if present
  if (cells[35].getMonth() !== month) cells.length = 35
  return cells
}

function dayLabel(offset, date) {
  if (offset === 0) return 'Today · 오늘'
  if (offset === 1) return 'Tomorrow · 내일'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function CalendarPanel() {
  const today = new Date()
  const cells = useMemo(() => monthGrid(today), [today.toDateString()])
  const { data } = useApi('/api/calendar', { fallback: FALLBACK, refreshMs: 5 * 60 * 1000 })
  const events = data.events ?? CALENDAR_EVENTS
  const isSample = data.source !== 'live'

  const eventsByOffset = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      if (!map.has(e.day)) map.set(e.day, [])
      map.get(e.day).push(e)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [events])

  const dotsFor = (cellDate) => {
    const offset = Math.round((cellDate - new Date(today.toDateString())) / 86400000)
    return events.filter((e) => e.day === offset).slice(0, 3)
  }

  return (
    <Panel
      icon="📅"
      title="Calendar"
      titleKo="일정"
      span={4}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="badge"><span className="dot-sm" style={{ background: 'var(--accent)' }} /> Google</span>
          <span className="badge"><span className="dot-sm" style={{ background: 'var(--purple)' }} /> iCloud</span>
        </div>
      }
      footer={
        isSample
          ? 'Sample events — connect calendars in the Connections tab'
          : 'Live · Google Calendar + iCloud (ICS), next 14 days'
      }
    >
      <div className="cal-layout">
        <div className="cal-month">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="dow">{d}</div>
          ))}
          {cells.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString()
            const other = d.getMonth() !== today.getMonth()
            return (
              <div key={i} className={`day ${isToday ? 'today' : ''} ${other ? 'other' : ''}`}>
                {d.getDate()}
                <span className="evt-dots">
                  {dotsFor(d).map((e) => (
                    <i key={e.id} style={{ background: isToday ? '#fff' : e.color }} />
                  ))}
                </span>
              </div>
            )
          })}
        </div>

        <div className="agenda">
          {eventsByOffset.map(([offset, dayEvents]) => {
            const date = new Date(today)
            date.setDate(today.getDate() + offset)
            return (
              <div key={offset}>
                <div className="day-label">{dayLabel(offset, date)}</div>
                {dayEvents.map((e) => (
                  <div key={e.id} className="event" style={{ marginTop: 6 }}>
                    <span className="bar" style={{ background: e.color }} />
                    <div>
                      <div className="title">{e.title}</div>
                      <div className="when">
                        {e.time}
                        {e.duration && ` · ${e.duration}`}
                      </div>
                    </div>
                    <span className="src">{e.calendar || e.source}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
