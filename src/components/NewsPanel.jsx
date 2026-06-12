import { useState } from 'react'
import Panel from './Panel.jsx'
import { NEWS } from '../data/mock.js'

const FILTERS = [
  { id: 'all', label: 'All · 전체' },
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
]

export default function NewsPanel() {
  const [filter, setFilter] = useState('all')
  const visible = NEWS.filter((n) => filter === 'all' || n.lang === filter)

  return (
    <Panel
      icon="📰"
      title="News briefing"
      titleKo="뉴스 브리핑"
      span={7}
      actions={
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`tab ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
      footer="Sample headlines — connect a news API (e.g. Naver News, NewsAPI) in src/data/mock.js"
    >
      <div className="news-list">
        {visible.map((n) => (
          <article key={n.id} className="news-item">
            <span className={`lang ${n.lang}`}>{n.lang === 'ko' ? '한' : 'EN'}</span>
            <div>
              <div className="headline">{n.headline}</div>
              <div className="news-meta">
                <span>{n.source}</span>
                <span>·</span>
                <span>{n.time}</span>
                <span className="cat">{n.category}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}
