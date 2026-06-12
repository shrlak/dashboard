// Mock data used until real integrations (Gmail API, CalDAV, news APIs)
// are wired up. Shapes here define the contract each panel expects.

export const EMAIL_ACCOUNTS = [
  { id: 'gmail-personal', label: 'Personal', address: 'spencerkim1235@gmail.com', color: 'var(--accent)' },
  { id: 'gmail-work', label: 'Work', address: 'spencer.kim@company.io', color: 'var(--green)' },
  { id: 'icloud', label: 'iCloud', address: 'spencerkim@icloud.com', color: 'var(--purple)' },
]

export const EMAILS = [
  { id: 1, account: 'gmail-personal', sender: 'GitHub', subject: 'Your weekly digest: 12 new stars', snippet: 'Here is what happened in repositories you watch this week…', time: '17:02', unread: true },
  { id: 2, account: 'gmail-work', sender: 'Hana Park', subject: 'Q3 roadmap review — moved to Monday', snippet: 'Hi Spencer, the roadmap review is moving to Monday 10am so that…', time: '16:40', unread: true },
  { id: 3, account: 'icloud', sender: 'Apple', subject: 'Your receipt from Apple', snippet: 'iCloud+ 200GB storage plan — ₩4,400. View your invoice…', time: '15:21', unread: true },
  { id: 4, account: 'gmail-personal', sender: '국민은행 KB', subject: '[KB국민은행] 해외송금 환율 우대 안내', snippet: '고객님께 적용 가능한 환율 우대 쿠폰이 도착했습니다…', time: '14:05', unread: false },
  { id: 5, account: 'gmail-work', sender: 'Jira', subject: '[DASH-214] Deploy pipeline failed on main', snippet: 'Build #88 failed at step docker-publish. Assigned to you…', time: '13:48', unread: true },
  { id: 6, account: 'gmail-personal', sender: 'Coupang', subject: '배송 출발! 오늘 도착 예정입니다', snippet: '주문하신 상품이 곧 도착합니다. 배송 현황을 확인해 보세요…', time: '11:30', unread: false },
  { id: 7, account: 'icloud', sender: 'Mom', subject: '주말에 시간 되니?', snippet: '이번 주말에 다같이 저녁 먹을까 하는데 시간 되는지 알려줘…', time: '09:12', unread: false },
  { id: 8, account: 'gmail-work', sender: 'AWS Billing', subject: 'Your invoice is available — May 2026', snippet: 'Total amount due: $214.87. Payment will be charged to the card…', time: 'Wed', unread: false },
]

// `day` is an offset from today: 0 = today, 1 = tomorrow…
export const CALENDAR_EVENTS = [
  { id: 1, day: 0, time: '10:00', duration: '1h', title: 'Standup — Platform team', source: 'Google', color: 'var(--accent)' },
  { id: 2, day: 0, time: '13:00', duration: '30m', title: '치과 예약 (Dental appointment)', source: 'iCloud', color: 'var(--purple)' },
  { id: 3, day: 0, time: '19:30', duration: '1h', title: 'Gym — push day', source: 'iCloud', color: 'var(--purple)' },
  { id: 4, day: 1, time: '10:00', duration: '2h', title: 'Q3 roadmap review', source: 'Google', color: 'var(--accent)' },
  { id: 5, day: 1, time: '18:00', duration: '2h', title: '저녁 약속 — 강남', source: 'iCloud', color: 'var(--purple)' },
  { id: 6, day: 3, time: '09:00', duration: '45m', title: '1:1 with Hana', source: 'Google', color: 'var(--accent)' },
  { id: 7, day: 5, time: 'All day', duration: '', title: '부모님 결혼기념일', source: 'iCloud', color: 'var(--purple)' },
]

export const NEWS = [
  { id: 1, lang: 'ko', source: '연합뉴스', time: '25분 전', category: '경제', headline: '원/달러 환율, 미 금리 동결 전망에 1,360원대 등락' },
  { id: 2, lang: 'en', source: 'Reuters', time: '40m ago', category: 'Markets', headline: 'Korean won steadies as Fed seen holding rates; exporters eye Q3' },
  { id: 3, lang: 'ko', source: 'KBS', time: '1시간 전', category: '사회', headline: '수도권 장마 시작…내일까지 최대 120mm 강한 비' },
  { id: 4, lang: 'en', source: 'Bloomberg', time: '2h ago', category: 'Tech', headline: 'Samsung unveils next-gen HBM4 roadmap as AI memory demand surges' },
  { id: 5, lang: 'ko', source: '한겨레', time: '3시간 전', category: 'IT', headline: '국내 AI 스타트업 투자 상반기 2조원 돌파…역대 최대' },
  { id: 6, lang: 'en', source: 'BBC', time: '4h ago', category: 'World', headline: 'Global chip supply chains shift as new trade rules take effect' },
  { id: 7, lang: 'ko', source: '조선일보', time: '5시간 전', category: '경제', headline: '한은 "하반기 물가 2%대 안정 전망"…기준금리 유지' },
  { id: 8, lang: 'en', source: 'TechCrunch', time: '6h ago', category: 'Tech', headline: 'The new wave of personal dashboard apps, and why they stick' },
]

// Fallback 30-day KRW/USD series used when the live FX API is unreachable.
export function fallbackFxSeries(days = 30, base = 1362.4) {
  const raw = []
  let v = base - 18
  for (let i = days - 1; i >= 0; i--) {
    v += (Math.sin(i * 1.7) + (((i * 37) % 11) - 5) / 9) * 2.1
    const d = new Date()
    d.setDate(d.getDate() - i)
    raw.push({ date: d.toISOString().slice(0, 10), rate: v })
  }
  // Shift the walk progressively so it lands exactly on `base` at the end
  // without a visible jump on the chart.
  const drift = base - raw[raw.length - 1].rate
  return raw.map((p, i) => ({
    date: p.date,
    rate: +(p.rate + (drift * i) / (raw.length - 1)).toFixed(2),
  }))
}
