import type { UsageDaily } from '../api/usage'

type Props = {
  data: UsageDaily[]
}

/** Lightweight dependency-free bar chart for daily token usage. */
export function TrendChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">暂无用量数据</div>
  }

  const width = 720
  const height = 220
  const padL = 44
  const padR = 12
  const padT = 16
  const padB = 28
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const max = Math.max(1, ...data.map((d) => d.total_tokens))
  const barW = Math.max(2, Math.min(28, plotW / data.length - 2))
  const step = plotW / data.length

  // Y axis: 4 gridlines including 0.
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: 480 }} role="img" aria-label="每日 Token 用量趋势">
        {ticks.map((t) => {
          const y = padT + plotH - t * plotH
          return (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border-tertiary)" strokeWidth={0.5} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={11} fill="var(--color-text-tertiary)">{fmt(max * t)}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const h = (d.total_tokens / max) * plotH
          const x = padL + i * step + (step - barW) / 2
          const y = padT + plotH - h
          const showLabel = data.length <= 15 || i % Math.ceil(data.length / 10) === 0
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={barW} height={Math.max(h, d.total_tokens > 0 ? 1 : 0)} rx={2} fill="var(--color-text-info)" opacity={0.75}>
                <title>{`${d.day}: ${d.total_tokens.toLocaleString('zh-CN')} tokens / ${d.requests} 次请求`}</title>
              </rect>
              {showLabel ? (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="var(--color-text-tertiary)">{d.day.slice(5)}</text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
