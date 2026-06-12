import Header from './components/Header.jsx'
import EmailPanel from './components/EmailPanel.jsx'
import CalendarPanel from './components/CalendarPanel.jsx'
import SystemHealthPanel from './components/SystemHealthPanel.jsx'
import ExchangePanel from './components/ExchangePanel.jsx'
import NewsPanel from './components/NewsPanel.jsx'

export default function App() {
  return (
    <div className="dashboard">
      <Header />
      <main className="grid">
        <EmailPanel />
        <CalendarPanel />
        <SystemHealthPanel />
        <ExchangePanel />
        <NewsPanel />
      </main>
    </div>
  )
}
