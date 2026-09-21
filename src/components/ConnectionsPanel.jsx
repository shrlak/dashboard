import { useEffect, useState } from 'react'
import Panel from './Panel.jsx'
import { useApi } from '../hooks/useApi.js'
import { apiFetch, apiUrl, getApiBase, setApiBase } from '../lib/apiBase.js'

const STATUS = {
  connected: { label: 'Connected', ko: '연결됨', cls: 'ok' },
  ready: { label: 'Ready to connect', ko: '연결 가능', cls: 'accent' },
  needs_setup: { label: 'Setup needed', ko: '설정 필요', cls: 'warn' },
  built_in: { label: 'Built-in', ko: '기본 제공', cls: 'info' },
  planned: { label: 'Coming soon', ko: '준비 중', cls: 'dim' },
  offline: { label: 'Backend offline', ko: '백엔드 꺼짐', cls: 'err' },
}

const CATEGORIES = [
  ['Google accounts', '구글 계정'],
  ['Other accounts', '기타 계정'],
  ['Feeds', '데이터 피드'],
]

// Shown when the backend can't be reached (e.g. before one is deployed).
const OFFLINE = {
  googleConfigured: false,
  accounts: [],
  items: [
    { id: 'add-google', kind: 'add-google', icon: '➕', category: 'Google accounts', name: 'Link a Google account', nameKo: '구글 계정 연결', status: 'offline', detail: 'Deploy the backend and point the Backend URL below at it to link Gmail and Calendar accounts.' },
    { id: 'icloud-calendar', icon: '☁️', category: 'Other accounts', name: 'iCloud Calendar', nameKo: '아이클라우드 캘린더', status: 'offline', detail: 'Configured on the backend via ICLOUD_ICS_URLS.' },
    { id: 'icloud-mail', icon: '📮', category: 'Other accounts', name: 'iCloud Mail', nameKo: '아이클라우드 메일', status: 'planned', detail: 'Needs an IMAP bridge with an app-specific password — not wired up yet.' },
    { id: 'news', icon: '📰', category: 'Feeds', name: 'News briefing', nameKo: '뉴스 브리핑', status: 'offline', detail: 'Live headlines are fetched by the backend (Google News RSS).' },
    { id: 'fx', icon: '💱', category: 'Feeds', name: 'KRW/USD rate', nameKo: '환율', status: 'offline', detail: 'Naver Finance via the backend, with frankfurter.app as a browser-side fallback.' },
  ],
}

// The OAuth callback sends the browser back here with ?connected= or ?error=.
function useOauthResult() {
  const [result, setResult] = useState(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected) setResult({ ok: true, text: `Linked ${connected}.` })
    else if (error === 'limit') setResult({ ok: false, text: 'Account limit reached — disconnect one first.' })
    else if (error === 'oauth') setResult({ ok: false, text: 'Google sign-in failed or was cancelled. Try again.' })
    if (connected || error) {
      // Clean the query string so a refresh doesn't replay the message.
      const url = new URL(window.location.href)
      for (const key of ['connected', 'error']) url.searchParams.delete(key)
      window.history.replaceState({}, '', url)
    }
  }, [])
  return result
}

export default function ConnectionsPanel() {
  const { data, live, refresh } = useApi('/api/integrations', { fallback: OFFLINE, refreshMs: 30000 })
  const [busy, setBusy] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [labelInput, setLabelInput] = useState('')
  const [baseInput, setBaseInput] = useState(getApiBase())
  const oauthResult = useOauthResult()
  const offline = !live
  const backendOrigin = getApiBase() || window.location.origin

  const saveBase = () => {
    setApiBase(baseInput)
    window.location.reload()
  }

  // After Google sign-in the backend sends the browser back here, even when
  // this frontend is hosted on a different origin (e.g. GitHub Pages).
  const connectHref = (item) =>
    `${apiUrl(item.connectUrl)}?return=${encodeURIComponent(
      window.location.origin + window.location.pathname
    )}`

  const post = async (path, body, account) => {
    setBusy(account)
    try {
      await apiFetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const disconnect = (account, email) => {
    if (!window.confirm(`Disconnect ${email || 'this account'}? Its mail and calendars stop syncing.`)) return
    post('/api/auth/google/disconnect', { account }, account)
  }

  const startRename = (item) => {
    setRenaming(item.account)
    setLabelInput(item.name)
  }

  const submitRename = async (account) => {
    setRenaming(null)
    if (labelInput.trim()) await post('/api/auth/google/rename', { account, label: labelInput }, account)
  }

  const linkedCount = data.accounts?.length ?? 0

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
            {offline
              ? 'Backend offline'
              : `Backend online · ${linkedCount} Google account${linkedCount === 1 ? '' : 's'}`}
          </span>
          <button className="refresh-btn" onClick={refresh}>↻ Refresh</button>
        </div>
      }
      footer="OAuth tokens live on the backend only (its KV store or data volume) and never reach the browser."
    >
      {oauthResult && (
        <div className={`conn-banner ${oauthResult.ok ? 'ok' : ''}`}>{oauthResult.text}</div>
      )}

      {offline && (
        <div className="conn-banner">
          <b>The backend isn’t reachable at {backendOrigin}.</b> Deploy it once (Vercel or any
          container host — see the README), then put its URL in the field below. Panels fall back
          to sample data meanwhile.
        </div>
      )}

      <div className="conn-backend">
        <div>
          <b>Backend URL</b> <span className="ko-dim">백엔드 주소</span>
          <div className="hint">
            The hosted API this dashboard reads from, e.g.{' '}
            <code>https://your-dashboard.vercel.app</code>. Leave empty when the backend serves
            this page itself.
          </div>
        </div>
        <div className="row">
          <input
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value)}
            placeholder="https://your-dashboard.vercel.app"
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
                const isAccount = item.kind === 'google-account'
                return (
                  <div
                    key={item.id}
                    className={`conn-card ${item.kind === 'add-google' ? 'add' : ''}`}
                    style={isAccount ? { borderLeft: `3px solid ${item.color}` } : undefined}
                  >
                    <div className="conn-head">
                      <span className="conn-icon">{item.icon}</span>
                      <div className="conn-name">
                        {renaming === item.account ? (
                          <input
                            className="conn-rename"
                            autoFocus
                            value={labelInput}
                            maxLength={40}
                            onChange={(e) => setLabelInput(e.target.value)}
                            onBlur={() => submitRename(item.account)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(item.account)
                              if (e.key === 'Escape') setRenaming(null)
                            }}
                          />
                        ) : (
                          item.name
                        )}
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
                          {item.kind === 'add-google' ? 'Sign in with Google' : 'Connect'}
                        </a>
                      )}
                      {isAccount && (
                        <>
                          <button
                            className="conn-btn"
                            disabled={busy === item.account}
                            onClick={() => startRename(item)}
                          >
                            Rename
                          </button>
                          <button
                            className="conn-btn"
                            disabled={busy === item.account}
                            onClick={() => disconnect(item.account, item.email)}
                          >
                            {busy === item.account ? '…' : 'Disconnect'}
                          </button>
                        </>
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
              Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in your
              host’s environment variables and redeploy.
            </li>
          </ol>
          <p>
            One OAuth client covers every account you link — sign in as many Google accounts as
            you like, each becomes its own inbox tab and calendar colour.
          </p>
        </div>
      )}
    </Panel>
  )
}
