import { useCallback, useEffect, useState } from 'react'
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react'
import { getUsageReport, type UsageReport } from '../api/usage'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { TrendChart } from '@/components/TrendChart'

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-secondary/60 rounded-md p-4" style={{ background: 'var(--color-background-secondary)' }}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function UsageDashboardPage() {
  const [days, setDays] = useState(30)
  const [report, setReport] = useState<UsageReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await getUsageReport(days, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用量数据失败')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const maxUser = report?.top_users[0]?.total_tokens || 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">用量看板</h2>
        <p className="text-sm text-muted-foreground">
          按自然日统计 Token 消耗与请求量，快速了解 Agent 的使用规模与成本分布。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} type="button" size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>
            近 {d} 天
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          {loading ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
          刷新
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="区间总用量" value={(report?.total_tokens ?? 0).toLocaleString('zh-CN')} hint="tokens" />
        <MetricCard label="请求次数" value={(report?.requests ?? 0).toLocaleString('zh-CN')} hint="次对话请求" />
        <MetricCard label="活跃用户" value={String(report?.top_users.length ?? 0)} hint="区间内有请求" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>每日用量趋势</CardTitle>
          <CardDescription>{report?.period || '—'}（UTC，按天聚合）</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !report ? <div className="flex h-56 items-center justify-center"><Spinner /></div> : <TrendChart data={report?.daily || []} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户用量排行</CardTitle>
          <CardDescription>区间内 Token 消耗 TOP 10</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(report?.top_users || []).map((u, i) => (
            <div key={u.user_id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{i + 1}. {u.user_id}</span>
                <span className="text-muted-foreground">{u.total_tokens.toLocaleString('zh-CN')} tokens · {u.requests} 次</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-background-secondary)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, (u.total_tokens / maxUser) * 100)}%`, background: 'var(--color-text-info)' }} />
              </div>
            </div>
          ))}
          {!loading && (report?.top_users.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">暂无用量数据</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
