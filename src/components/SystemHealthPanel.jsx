import Panel from './Panel.jsx'
import Sparkline from './widgets/Sparkline.jsx'
import { useSystemStats } from '../hooks/useSystemStats.js'

function meterColor(pct) {
  if (pct < 60) return 'var(--green)'
  if (pct < 85) return 'var(--yellow)'
  return 'var(--red)'
}

// Some live values are unavailable on servers (battery, sometimes network)
// and come back as null — show a dash instead of a number.
const fmt = (v) => (v == null ? '—' : v.toFixed(0))

// 184500 s → "2d 3h", 7320 s → "2h 2m", 90 s → "1m"
function fmtUptime(seconds) {
  if (seconds == null) return null
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

function Stat({ label, labelKo, value, unit, pct }) {
  return (
    <div className="stat">
      <div className="label">
        <span>{label}</span>
        <span>{labelKo}</span>
      </div>
      <div className="value">
        {value}
        <small> {unit}</small>
      </div>
      {pct != null && (
        <div className="meter">
          <i style={{ width: `${pct}%`, background: meterColor(pct) }} />
        </div>
      )}
    </div>
  )
}

export default function SystemHealthPanel() {
  const s = useSystemStats()

  return (
    <Panel
      icon="💻"
      title="System"
      titleKo="시스템 상태"
      span={3}
      actions={
        <span className="badge">
          <span className="live-dot" /> {s.live ? 'live' : 'simulated'}
        </span>
      }
      footer={
        s.live
          ? `Live from the backend host (${s.host})`
          : 'Simulated in-browser — start the backend for real stats'
      }
    >
      <div className="sys-status">
        <span className="badge">
          <span
            className="dot-sm"
            style={{
              background:
                s.online == null ? 'var(--yellow)' : s.online ? 'var(--green)' : 'var(--red)',
            }}
          />
          {s.online == null ? 'Checking…' : s.online ? 'Online' : 'Offline'}
          {s.latencyMs != null && ` · ${s.latencyMs} ms`}
        </span>
        {fmtUptime(s.uptime) && <span className="badge">Uptime {fmtUptime(s.uptime)}</span>}
      </div>
      <div className="stat-grid">
        <Stat label="CPU" labelKo="프로세서" value={fmt(s.cpu)} unit="%" pct={s.cpu} />
        <Stat label="Memory" labelKo="메모리" value={fmt(s.memory)} unit="%" pct={s.memory} />
        <Stat label="Disk" labelKo="디스크" value={fmt(s.disk)} unit="% used" pct={s.disk} />
        <Stat label="Battery" labelKo="배터리" value={fmt(s.battery)} unit="%" pct={s.battery} />
        <Stat label="Down" labelKo="다운로드" value={fmt(s.netDown)} unit="Mbps" />
        <Stat label="Up" labelKo="업로드" value={fmt(s.netUp)} unit="Mbps" />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>CPU — last 80s</div>
        <Sparkline values={s.history} width={300} height={56} stroke="var(--green)" fill="rgba(62,207,142,0.10)" />
      </div>
    </Panel>
  )
}
