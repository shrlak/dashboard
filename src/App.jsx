import { useState } from 'react'
import Header from './components/Header.jsx'
import EmailPanel from './components/EmailPanel.jsx'
import CalendarPanel from './components/CalendarPanel.jsx'
import SystemHealthPanel from './components/SystemHealthPanel.jsx'
import ExchangePanel from './components/ExchangePanel.jsx'
import NewsPanel from './components/NewsPanel.jsx'
import ConnectionsPanel from './components/ConnectionsPanel.jsx'
import LoginGate from './components/LoginGate.jsx'

// The OAuth callback redirects to /?tab=connections so the user lands back
// on the Connections tab after signing in with Google.
function initialTab() {
  return new URLSearchParams(window.location.search).get('tab') === 'connections'
    ? 'connections'
    : 'overview'
}

export default function App() {
  const [tab, setTab] = useState(initialTab)

  return (
    <LoginGate>
      <div className="dashboard">
        <Header tab={tab} onTabChange={setTab} />
        <main className="grid">
          {tab === 'overview' ? (
            <>
              <EmailPanel />
              <CalendarPanel />
              <SystemHealthPanel />
              <ExchangePanel />
              <NewsPanel />
            </>
          ) : (
            <ConnectionsPanel />
          )}
        </main>
      </div>
    </LoginGate>
  )
}
