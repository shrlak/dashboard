import Panel from './Panel.jsx'
import Sparkline from './widgets/Sparkline.jsx'
import { useSystemStats } from '../hooks/useSystemStats.js'

function meterColor(pct) {
  if (pct < 60) return 'var(--green)'
  if (pct < 85) return 'var(--yellow)'
  return 'var(--red)'
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
          <span className="live-dot" /> {s.isLive ? 'live' : 'demo'}
        </span>
      }
      footer={
        s.isLive
          ? 'Live from local backend (systeminformation)'
          : 'Simulated — run `npm run server` for real stats'
      }
    >
      <div className="stat-grid">
        <Stat label="CPU" labelKo="프로세서" value={s.cpu.toFixed(0)} unit="%" pct={s.cpu} />
        <Stat label="Memory" labelKo="메모리" value={s.memory.toFixed(0)} unit="%" pct={s.memory} />
        <Stat label="Disk" labelKo="디스크" value={s.disk.toFixed(0)} unit="% used" pct={s.disk} />
        <Stat
          label="Battery"
          labelKo="배터리"
          value={s.battery == null ? '—' : s.battery.toFixed(0)}
          unit={s.battery == null ? 'no battery' : '%'}
          pct={s.battery}
        />
        <Stat label="Down" labelKo="다운로드" value={s.netDown.toFixed(0)} unit="Mbps" />
        <Stat label="Up" labelKo="업로드" value={s.netUp.toFixed(0)} unit="Mbps" />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>CPU — last 80s</div>
        <Sparkline values={s.history} width={300} height={56} stroke="var(--green)" fill="rgba(62,207,142,0.10)" />
      </div>
    </Panel>
  )
}
