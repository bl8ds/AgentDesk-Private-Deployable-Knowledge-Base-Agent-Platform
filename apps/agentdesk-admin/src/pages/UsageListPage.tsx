import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { listUsage, type UsageEvent } from '../api/usage'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'

function formatTime(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(d)
}

export function UsageListPage() {
  const [rows, setRows] = useState<UsageEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [userId, setUserId] = useState('')
  const [appliedUser, setAppliedUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listUsage(page, pageSize, { user_id: appliedUser })
      setRows(res.items)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用量明细失败')
    } finally {
      setLoading(false)
    }
  }, [page, appliedUser])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">用量明细</h2>
        <p className="text-sm text-muted-foreground">
          逐条记录每次对话请求的模型与 Token 消耗，支持按用户筛选。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>请求记录</CardTitle>
            <CardDescription>共 {total} 条</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            刷新
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="usage-user">用户 ID</label>
              <Input
                id="usage-user"
                className="w-48"
                placeholder="按用户筛选"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setAppliedUser(userId.trim()) } }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => { setPage(1); setAppliedUser(userId.trim()) }}>
              <SearchIcon data-icon="inline-start" />
              筛选
            </Button>
            {appliedUser ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setUserId(''); setPage(1); setAppliedUser('') }}>
                清除
              </Button>
            ) : null}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead className="text-right">输入</TableHead>
                  <TableHead className="text-right">输出</TableHead>
                  <TableHead className="text-right">推理</TableHead>
                  <TableHead className="text-right">合计</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatTime(r.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                    <TableCell className="text-xs">{r.model || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.prompt_tokens.toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.completion_tokens.toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.reasoning_tokens.toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">{r.total_tokens.toLocaleString('zh-CN')}</TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">暂无用量记录</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>第 {page} / {totalPages} 页</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeftIcon data-icon="inline-start" />
                上一页
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                下一页
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
