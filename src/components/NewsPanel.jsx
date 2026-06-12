import { useState } from 'react'
import Panel from './Panel.jsx'
import { useApi } from '../hooks/useApi.js'
import { NEWS } from '../data/mock.js'

const FALLBACK = { source: 'sample', items: NEWS }

const FILTERS = [
  { id: 'all', label: 'All · 전체' },
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
]

export default function NewsPanel() {
  const [filter, setFilter] = useState('all')
  const { data } = useApi('/api/news', { fallback: FALLBACK, refreshMs: 5 * 60 * 1000 })
  const items = data.items ?? NEWS
  const isSample = data.source !== 'live'
  const visible = items.filter((n) => filter === 'all' || n.lang === filter)

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
      footer={
        isSample
          ? 'Sample headlines — start the backend for live news (Google News RSS)'
          : 'Live · Google News RSS (한국어 + English), refreshed every 5 min'
      }
    >
      <div className="news-list">
        {visible.map((n) => (
          <article key={n.id} className="news-item">
            <span className={`lang ${n.lang}`}>{n.lang === 'ko' ? '한' : 'EN'}</span>
            <div>
              <div className="headline">
                {n.link ? (
                  <a href={n.link} target="_blank" rel="noreferrer">
                    {n.headline}
                  </a>
                ) : (
                  n.headline
                )}
              </div>
              <div className="news-meta">
                <span>{n.source}</span>
                <span>·</span>
                <span>{n.time}</span>
                {n.category && <span className="cat">{n.category}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}
