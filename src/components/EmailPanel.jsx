import { useMemo, useState } from 'react'
import Panel from './Panel.jsx'
import { EMAIL_ACCOUNTS, EMAILS } from '../data/mock.js'

export default function EmailPanel() {
  const [active, setActive] = useState('all')

  const unreadByAccount = useMemo(() => {
    const counts = { all: 0 }
    for (const acc of EMAIL_ACCOUNTS) counts[acc.id] = 0
    for (const m of EMAILS) {
      if (!m.unread) continue
      counts.all += 1
      counts[m.account] += 1
    }
    return counts
  }, [])

  const visible = EMAILS.filter((m) => active === 'all' || m.account === active)
  const accountOf = (id) => EMAIL_ACCOUNTS.find((a) => a.id === id)

  return (
    <Panel
      icon="✉️"
      title="Inbox"
      titleKo="메일"
      span={5}
      actions={
        <span className="badge">
          <span className="live-dot" /> {unreadByAccount.all} unread
        </span>
      }
      footer={`Accounts: ${EMAIL_ACCOUNTS.map((a) => a.address).join(' · ')}`}
    >
      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${active === 'all' ? 'active' : ''}`} onClick={() => setActive('all')}>
          All {unreadByAccount.all > 0 && <span className="count">{unreadByAccount.all}</span>}
        </button>
        {EMAIL_ACCOUNTS.map((acc) => (
          <button
            key={acc.id}
            className={`tab ${active === acc.id ? 'active' : ''}`}
            onClick={() => setActive(acc.id)}
          >
            {acc.label}
            {unreadByAccount[acc.id] > 0 && <span className="count">{unreadByAccount[acc.id]}</span>}
          </button>
        ))}
      </div>

      <div className="email-list">
        {visible.map((m) => (
          <article key={m.id} className={`email-item ${m.unread ? '' : 'read'}`}>
            <span className="dot" style={{ background: accountOf(m.account)?.color }} title={accountOf(m.account)?.address} />
            <div style={{ minWidth: 0 }}>
              <div className="sender">{m.sender}</div>
              <div className="subject">{m.subject}</div>
              <div className="snippet">{m.snippet}</div>
            </div>
            <div className="meta">
              {m.time}
              {m.unread && (
                <div>
                  <span className="unread-pip" />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}
