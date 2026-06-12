import { useMemo, useState } from 'react'
import Panel from './Panel.jsx'
import { useEmails } from '../hooks/useEmails.js'

export default function EmailPanel() {
  const { isLive, accounts, emails } = useEmails()
  const [active, setActive] = useState('all')

  const unreadByAccount = useMemo(() => {
    const counts = { all: 0 }
    for (const acc of accounts) counts[acc.id] = 0
    for (const m of emails) {
      if (!m.unread) continue
      counts.all += 1
      counts[m.account] = (counts[m.account] ?? 0) + 1
    }
    return counts
  }, [accounts, emails])

  const visible = emails.filter((m) => active === 'all' || m.account === active)
  const accountOf = (id) => accounts.find((a) => a.id === id)

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
      footer={
        isLive
          ? `Live · ${accounts.map((a) => a.address).join(' · ')}`
          : 'Sample data — run `npm run server` and connect accounts (see README)'
      }
    >
      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${active === 'all' ? 'active' : ''}`} onClick={() => setActive('all')}>
          All {unreadByAccount.all > 0 && <span className="count">{unreadByAccount.all}</span>}
        </button>
        {accounts.map((acc) => (
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
