import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/apiBase.js'

// Wraps the app in the master-password login. Asks the backend whether a login
// is required; if so and there's no valid session, it shows the password
// screen. When the backend is unreachable the app still renders (sample-data
// mode), so a static/offline deploy isn't blocked behind a login it can't check.
export default function LoginGate({ children }) {
  const [status, setStatus] = useState('checking') // checking | locked | open
  const [required, setRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const check = async () => {
    try {
      const res = await apiFetch('/api/auth/session')
      if (!res.ok) throw new Error('session check failed')
      const d = await res.json()
      setRequired(Boolean(d.required))
      setStatus(d.required && !d.authed ? 'locked' : 'open')
    } catch {
      setRequired(false)
      setStatus('open')
    }
  }

  useEffect(() => {
    check()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setPassword('')
        setStatus('open')
        return
      }
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Incorrect password.')
    } catch {
      setError('Could not reach the backend.')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore — we lock the UI regardless
    }
    setStatus('locked')
  }

  if (status === 'checking') {
    return (
      <div className="login-screen">
        <div className="login-card">Loading…</div>
      </div>
    )
  }

  if (status === 'locked') {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={submit}>
          <div className="login-title">
            🔒 Dashboard locked <span className="ko">대시보드 잠금</span>
          </div>
          <p className="login-hint">Enter the master password to continue.</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master password"
            spellCheck={false}
          />
          {error && <div className="login-error">{error}</div>}
          <button className="conn-btn primary" type="submit" disabled={busy || !password}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      {children}
      {required && (
        <button className="logout-btn" onClick={logout} title="Lock the dashboard">
          🔒 Lock
        </button>
      )}
    </>
  )
}
