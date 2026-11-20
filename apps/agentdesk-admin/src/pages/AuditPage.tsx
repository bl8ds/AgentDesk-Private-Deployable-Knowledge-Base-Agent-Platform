import { useCallback, useEffect, useState } from 'react'
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import {
  actionLabel,
  listAudit,
  listAuditActions,
  type AuditFilter,
  type AuditLog,
} from '../api/audit'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(d)
}

function MetaView({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta || Object.keys(meta).length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <code className="text-xs text-muted-foreground">
      {Object.entries(meta).map(([k, v]) => `${k}=${String(v)}`).join('  ')}
    </code>
  )
}

export function AuditPage() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [filter, setFilter] = useState<AuditFilter>({})
  const [actorInput, setActorInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, act] = await Promise.all([
        listAudit(page, pageSize, filter),
        listAuditActions(),
      ])
      setRows(res.items)
      setTotal(res.pagination.total)
      setActions(act.actions)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载审计日志失败')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const applyFilter = () => {
    setPage(1)
    setFilter((prev) => ({ ...prev, actor_id: actorInput.trim() || undefined }))
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">审计日志</h2>
        <p className="text-sm text-muted-foreground">
          记录对话、文档变更、配额与模型配置等关键操作，按时间倒序排列。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>操作记录</CardTitle>
            <CardDescription>共 {total} 条记录</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            刷新
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="audit-action">操作类型</label>
              <select
                id="audit-action"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={filter.action || ''}
                onChange={(e) => { setPage(1); setFilter((p) => ({ ...p, action: e.target.value || undefined })) }}
              >
                <option value="">全部</option>
                {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="audit-actor">操作者 ID</label>
              <Input
                id="audit-actor"
                className="w-48"
                placeholder="按用户筛选"
                value={actorInput}
                onChange={(e) => setActorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilter() }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={applyFilter}>
              <SearchIcon data-icon="inline-start" />
              筛选
            </Button>
            {(filter.action || filter.actor_id) ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setActorInput('')
                setPage(1)
                setFilter({})
              }}>
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
                  <TableHead>操作</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>资源</TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatTime(r.created_at)}</TableCell>
                    <TableCell><Badge variant="secondary">{actionLabel(r.action)}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.actor_id || '—'}</TableCell>
                    <TableCell className="text-xs">{r.resource_type}{r.resource_id ? ` / ${r.resource_id.slice(0, 12)}` : ''}</TableCell>
                    <TableCell><MetaView meta={r.meta} /></TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">暂无审计记录</TableCell>
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
