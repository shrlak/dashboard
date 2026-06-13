import Panel from './Panel.jsx'
import Sparkline from './widgets/Sparkline.jsx'
import { useExchangeRate } from '../hooks/useExchangeRate.js'

const krw = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export default function ExchangePanel() {
  const { loading, isLive, source, rate, series, updatedAt, refresh } = useExchangeRate()

  const prev = series.length > 1 ? series[series.length - 2].rate : null
  const delta = rate != null && prev != null ? rate - prev : null
  const deltaPct = delta != null ? (delta / prev) * 100 : null

  return (
    <Panel
      icon="💱"
      title="KRW / USD"
      titleKo="원·달러 환율"
      span={5}
      actions={
        <button className="refresh-btn" onClick={refresh} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      }
      footer={
        isLive
          ? `Live from ${source ?? 'the network'} · updated ${updatedAt?.toLocaleTimeString()}`
          : 'Offline — showing sample data. Live rates load automatically when the network allows.'
      }
    >
      {rate == null ? (
        <div style={{ color: 'var(--text-dim)' }}>Loading exchange rate…</div>
      ) : (
        <>
          <div className="fx-rate">
            <span className="big">₩{krw.format(rate)}</span>
            <span style={{ color: 'var(--text-dim)' }}>per $1</span>
            {delta != null && (
              <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)} ({deltaPct.toFixed(2)}%)
                <span style={{ fontWeight: 400, opacity: 0.75 }}> vs prev. day</span>
              </span>
            )}
          </div>

          <div className="fx-convert">
            <div className="cell">$100 <b>₩{krw.format(100 * rate)}</b></div>
            <div className="cell">$1,000 <b>₩{krw.format(1000 * rate)}</b></div>
            <div className="cell">₩1,000,000 <b>${usd.format(1000000 / rate)}</b></div>
          </div>

          <div className="fx-chart">
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>
              Last 30 days · 최근 30일
            </div>
            <Sparkline
              values={series.map((p) => p.rate)}
              showLabels
              labels={series.map((p) => p.date.slice(5))}
            />
          </div>
        </>
      )}
    </Panel>
  )
}
