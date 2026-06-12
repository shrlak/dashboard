import { useState } from 'react'
import Panel from './Panel.jsx'
import { useApi } from '../hooks/useApi.js'
import { apiUrl, getApiBase, setApiBase } from '../lib/apiBase.js'

const STATUS = {
  connected: { label: 'Connected', ko: '연결됨', cls: 'ok' },
  ready: { label: 'Ready to connect', ko: '연결 가능', cls: 'accent' },
  needs_setup: { label: 'Setup needed', ko: '설정 필요', cls: 'warn' },
  built_in: { label: 'Built-in', ko: '기본 제공', cls: 'info' },
  planned: { label: 'Coming soon', ko: '준비 중', cls: 'dim' },
  offline: { label: 'Backend offline', ko: '백엔드 꺼짐', cls: 'err' },
}

const CATEGORIES = [
  ['Email', '메일'],
  ['Calendar', '캘린더'],
  ['Feeds', '데이터 피드'],
  ['System', '시스템'],
]

// Shown when no backend is reachable (e.g. static GitHub Pages deploy).
const OFFLINE = {
  offline: true,
  googleConfigured: false,
  items: [
    { id: 'gmail-personal', icon: '✉️', category: 'Email', name: 'Gmail — Personal', nameKo: '지메일 (개인)', status: 'offline', detail: 'Start the backend to connect this inbox.' },
    { id: 'gmail-work', icon: '✉️', category: 'Email', name: 'Gmail — Work', nameKo: '지메일 (업무)', status: 'offline', detail: 'Start the backend to connect this inbox.' },
    { id: 'icloud-mail', icon: '📮', category: 'Email', name: 'iCloud Mail', nameKo: '아이클라우드 메일', status: 'planned', detail: 'Needs an IMAP bridge with an app-specific password — not wired up yet.' },
    { id: 'google-calendar', icon: '📅', category: 'Calendar', name: 'Google Calendar', nameKo: '구글 캘린더', status: 'offline', detail: 'Comes with the Gmail sign-in once the backend is running.' },
    { id: 'icloud-calendar', icon: '☁️', category: 'Calendar', name: 'iCloud Calendar', nameKo: '아이클라우드 캘린더', status: 'offline', detail: 'Configured on the backend via ICLOUD_ICS_URLS.' },
    { id: 'news', icon: '📰', category: 'Feeds', name: 'News briefing', nameKo: '뉴스 브리핑', status: 'offline', detail: 'Live headlines are fetched by the backend (Google News RSS).' },
    { id: 'fx', icon: '💱', category: 'Feeds', name: 'KRW/USD rate', nameKo: '환율', status: 'built_in', detail: 'frankfurter.app — fetched directly by your browser, works without the backend.' },
    { id: 'system', icon: '💻', category: 'System', name: 'System health', nameKo: '시스템 상태', status: 'offline', detail: 'Real stats come from the machine running the backend.' },
  ],
}

export default function ConnectionsPanel() {
  const { data, live, refresh } = useApi('/api/integrations', { fallback: OFFLINE, refreshMs: 30000 })
  const [busy, setBusy] = useState(null)
  const [baseInput, setBaseInput] = useState(getApiBase())
  const offline = !live
  const backendOrigin = getApiBase() || window.location.origin

  const saveBase = () => {
    setApiBase(baseInput)
    window.location.reload()
  }

  // After Google sign-in the backend sends the browser back here, even when
  // this frontend is hosted on a different origin (e.g. GitHub Pages).
  const connectHref = (item) =>
    `${apiUrl(item.connectUrl)}&return=${encodeURIComponent(
      window.location.origin + window.location.pathname
    )}`

  const disconnect = async (account) => {
    setBusy(account)
    try {
      await fetch(apiUrl('/api/auth/google/disconnect'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account }),
      })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const connectedCount = data.items.filter((i) => i.status === 'connected').length

  return (
    <Panel
      icon="🔌"
      title="Connections & integrations"
      titleKo="연결 및 연동"
      span={12}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge">
            <span className="dot-sm" style={{ background: offline ? 'var(--red)' : 'var(--green)' }} />
            {offline ? 'Backend offline' : `Backend online · ${connectedCount} connected`}
          </span>
          <button className="refresh-btn" onClick={refresh}>↻ Refresh</button>
        </div>
      }
      footer="OAuth tokens are stored on the backend only (server/.data/) and never reach the browser."
    >
      {offline && (
        <div className="conn-banner">
          <b>The backend isn’t reachable at {backendOrigin}.</b> Start it with{' '}
          <code>npm start</code> on the machine it should run on (and set{' '}
          <code>ALLOWED_ORIGINS</code> in its <code>.env</code> when this page is hosted
          elsewhere, e.g. GitHub Pages), or point the Backend URL below at a running instance.
          Panels fall back to sample data meanwhile.
        </div>
      )}

      <div className="conn-backend">
        <div>
          <b>Backend URL</b> <span className="ko-dim">백엔드 주소</span>
          <div className="hint">
            Where this dashboard fetches live data. Use <code>http://localhost:8787</code> when
            the backend runs on your own computer; leave empty when the backend serves this app
            itself.
          </div>
        </div>
        <div className="row">
          <input
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value)}
            placeholder="http://localhost:8787"
            spellCheck={false}
          />
          <button className="conn-btn primary" onClick={saveBase}>
            Save &amp; reload
          </button>
        </div>
      </div>

      {CATEGORIES.map(([category, categoryKo]) => {
        const items = data.items.filter((i) => i.category === category)
        if (!items.length) return null
        return (
          <div key={category}>
            <div className="conn-section-title">
              {category} · {categoryKo}
            </div>
            <div className="conn-grid">
              {items.map((item) => {
                const status = STATUS[item.status] ?? STATUS.offline
                return (
                  <div key={item.id} className="conn-card">
                    <div className="conn-head">
                      <span className="conn-icon">{item.icon}</span>
                      <div className="conn-name">
                        {item.name}
                        <span className="ko">{item.nameKo}</span>
                      </div>
                    </div>
                    <div className="conn-detail">{item.detail}</div>
                    <div className="conn-foot">
                      <span className={`status-pill ${status.cls}`}>
                        {status.label} · {status.ko}
                      </span>
                      {item.status === 'ready' && item.connectUrl && (
                        <a className="conn-btn primary" href={connectHref(item)}>
                          Connect
                        </a>
                      )}
                      {item.status === 'connected' && item.account && (
                        <button
                          className="conn-btn"
                          disabled={busy === item.account}
                          onClick={() => disconnect(item.account)}
                        >
                          {busy === item.account ? '…' : 'Disconnect'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!offline && !data.googleConfigured && (
        <div className="conn-setup">
          <b>Enable Google sign-in (Gmail + Calendar):</b>
          <ol>
            <li>
              In{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                Google Cloud Console
              </a>
              , create an <i>OAuth client ID</i> (type: Web application) and enable the Gmail and
              Calendar APIs.
            </li>
            <li>
              Add <code>{backendOrigin}/api/auth/google/callback</code> as an authorized redirect
              URI.
            </li>
            <li>
              Put <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in{' '}
              <code>.env</code> (see <code>.env.example</code>) and restart the backend.
            </li>
          </ol>
        </div>
      )}
    </Panel>
  )
}
