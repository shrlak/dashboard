// Lightweight SVG line chart — avoids pulling in a chart library.
export default function Sparkline({
  values,
  width = 520,
  height = 110,
  stroke = 'var(--accent)',
  fill = 'rgba(91, 140, 255, 0.12)',
  showLabels = false,
  labels = [],
}) {
  if (!values.length) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 6
  const w = width - pad * 2
  const h = height - pad * 2

  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1 || 1)) * w,
    pad + h - ((v - min) / range) * h,
  ])
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${pad + h} ${line} ${pad + w},${pad + h}`
  const [lastX, lastY] = pts[pts.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height + (showLabels ? 16 : 0)}`}
      width="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label="trend chart"
    >
      <polygon points={area} fill={fill} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill={stroke} />
      {showLabels && labels.length >= 2 && (
        <>
          <text x={pad} y={height + 12} fontSize="10" fill="var(--text-faint)">
            {labels[0]}
          </text>
          <text x={width - pad} y={height + 12} fontSize="10" fill="var(--text-faint)" textAnchor="end">
            {labels[labels.length - 1]}
          </text>
        </>
      )}
    </svg>
  )
}
