import { useCallback, useEffect, useState } from 'react'
import { AlertCircleIcon, RefreshCwIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react'
import { getSystemHealth, type SystemHealth } from '../api/health'
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

const SERVICES: { key: keyof Pick<SystemHealth, 'db' | 'redis' | 'agent'>; label: string; desc: string }[] = [
  { key: 'db', label: 'PostgreSQL', desc: '业务库与知识库元数据' },
  { key: 'redis', label: 'Redis', desc: '会话与配额缓存' },
  { key: 'agent', label: 'Agent 运行时', desc: 'RAG 检索与模型推理' },
]

export function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setHealth(await getSystemHealth())
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取健康状态失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const allUp = health?.status === 'ok'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">系统健康</h2>
        <p className="text-sm text-muted-foreground">
          实时检查后端依赖服务的连通状态，定位故障环节。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>服务状态</CardTitle>
            <CardDescription>由后端实时探测（超时 2 秒）</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            重新检测
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center gap-3 rounded-lg border p-4">
            {loading && !health ? (
              <Spinner />
            ) : allUp ? (
              <CheckCircle2Icon className="size-6 text-green-600" />
            ) : (
              <XCircleIcon className="size-6 text-red-600" />
            )}
            <div>
              <p className="font-medium">{allUp ? '所有服务正常' : health ? '部分服务异常' : '检测中'}</p>
              <p className="text-sm text-muted-foreground">
                整体状态：{health?.status ?? '—'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {SERVICES.map((s) => {
              const up = health?.[s.key] === 'up'
              return (
                <div key={s.key} className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.label}</p>
                    {up ? (
                      <CheckCircle2Icon className="size-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="size-5 text-red-600" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                  <p className="mt-2 text-sm font-medium">{health?.[s.key] ?? '—'}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
