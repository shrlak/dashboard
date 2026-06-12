import { useClock } from '../hooks/useClock.js'

export default function Header() {
  const now = useClock()
  const hour = now.getHours()
  const greeting =
    hour < 6 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greetingKo = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요'

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateEn = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const dateKo = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <header className="header">
      <div>
        <h1>
          {greeting}, Spencer <span aria-hidden>👋</span>
        </h1>
        <div className="subtitle">{greetingKo} · 오늘도 좋은 하루 보내세요</div>
      </div>
      <div className="clock">
        <div className="time">{time}</div>
        <div className="date">
          {dateEn} · {dateKo}
        </div>
      </div>
    </header>
  )
}
