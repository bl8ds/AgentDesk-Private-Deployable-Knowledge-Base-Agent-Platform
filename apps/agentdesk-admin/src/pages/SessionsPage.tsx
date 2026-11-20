import { useCallback, useEffect, useState } from 'react'
import { AlertCircleIcon, RefreshCwIcon, SearchIcon, LogOutIcon } from 'lucide-react'
import {
  listSessions,
  revokeSession,
  type SessionRow,
} from '../api/sessions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

function isActive(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() > Date.now()
}

export function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[]>([])
  const [userId, setUserId] = useState('')
  const [appliedUser, setAppliedUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<SessionRow | null>(null)
  const [revoking, setRevoking] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listSessions(200, appliedUser)
      setRows(res.sessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载会话失败')
    } finally {
      setLoading(false)
    }
  }, [appliedUser])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const confirmRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    setError(null)
    try {
      await revokeSession(revokeTarget.id)
      setRevokeTarget(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '强制下线失败')
      setRevokeTarget(null)
    } finally {
      setRevoking(false)
    }
  }

  const activeCount = rows.filter((r) => isActive(r.expires_at)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">会话管理</h2>
        <p className="text-sm text-muted-foreground">
          查看已签发的登录会话，可对指定会话执行强制下线（立即失效其访问令牌）。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>登录会话</CardTitle>
            <CardDescription>共 {rows.length} 条 · 生效中 {activeCount} 条</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            刷新
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="session-user">用户 ID</label>
              <Input
                id="session-user"
                className="w-48"
                placeholder="按用户筛选"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedUser(userId.trim()) } }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setAppliedUser(userId.trim())}>
              <SearchIcon data-icon="inline-start" />
              筛选
            </Button>
            {appliedUser ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setUserId(''); setAppliedUser('') }}>
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
                  <TableHead>用户</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>渠道</TableHead>
                  <TableHead>签发时间</TableHead>
                  <TableHead>过期时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                    <TableCell className="text-xs">{r.level || '—'}</TableCell>
                    <TableCell className="text-xs">{r.channel || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatTime(r.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatTime(r.expires_at)}</TableCell>
                    <TableCell>
                      <Badge variant={isActive(r.expires_at) ? 'default' : 'secondary'}>
                        {isActive(r.expires_at) ? '生效中' : '已过期'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!isActive(r.expires_at)}
                        onClick={() => setRevokeTarget(r)}
                      >
                        <LogOutIcon data-icon="inline-start" />
                        强制下线
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">暂无会话记录</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认强制下线？</AlertDialogTitle>
            <AlertDialogDescription>
              将立即使会话「{revokeTarget?.user_id}」的访问令牌失效，该用户需重新登录。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRevoke()} disabled={revoking}>
              {revoking ? '处理中…' : '确认下线'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
