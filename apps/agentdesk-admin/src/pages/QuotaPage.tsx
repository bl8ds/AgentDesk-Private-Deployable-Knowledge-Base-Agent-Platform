import { useCallback, useEffect, useState } from 'react'
import { RefreshCwIcon, SaveIcon, AlertCircleIcon } from 'lucide-react'
import {
  getGlobalQuota,
  getQuota,
  listQuotas,
  putGlobalQuota,
  upsertQuota,
  type QuotaRow,
} from '../api/quotas'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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

export function QuotaPage() {
  const [rows, setRows] = useState<QuotaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'shared' | 'per_user_default'>('shared')
  const [globalLimit, setGlobalLimit] = useState('1000000')
  const [globalNote, setGlobalNote] = useState('')
  const [globalUsed, setGlobalUsed] = useState<number | null>(null)
  const [savingGlobal, setSavingGlobal] = useState(false)

  const [userId, setUserId] = useState('')
  const [userLimit, setUserLimit] = useState('1000000')
  const [userNote, setUserNote] = useState('')
  const [userUsed, setUserUsed] = useState<number | null>(null)
  const [savingUser, setSavingUser] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [g, list] = await Promise.all([getGlobalQuota(), listQuotas(100)])
      setMode(g.mode)
      setGlobalLimit(String(g.token_limit))
      setGlobalNote(g.note || '')
      setGlobalUsed(g.used_tokens)
      setRows(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载配额失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveGlobal = async () => {
    const tokenLimit = Number(globalLimit)
    if (!Number.isFinite(tokenLimit) || tokenLimit < 0) {
      setError('月度额度须为非负整数')
      return
    }
    setSavingGlobal(true)
    setError(null)
    try {
      await putGlobalQuota({
        mode,
        token_limit: Math.trunc(tokenLimit),
        note: globalNote,
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存全局配额失败')
    } finally {
      setSavingGlobal(false)
    }
  }

  const loadOne = async () => {
    const id = userId.trim()
    if (!id) return
    setError(null)
    try {
      const q = await getQuota(id)
      setUserLimit(String(q.token_limit))
      setUserNote(q.note || '')
      setUserUsed(q.used_tokens)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败')
    }
  }

  const saveUser = async () => {
    const id = userId.trim()
    if (!id) {
      setError('请输入用户标识')
      return
    }
    const tokenLimit = Number(userLimit)
    if (!Number.isFinite(tokenLimit) || tokenLimit < 0) {
      setError('用户额度须为非负整数')
      return
    }
    setSavingUser(true)
    setError(null)
    try {
      await upsertQuota(id, { token_limit: Math.trunc(tokenLimit), note: userNote })
      await refresh()
      await loadOne()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSavingUser(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">用量配额</h2>
        <p className="text-sm text-muted-foreground">
          按自然月统计 Token 用量；超出额度后，对话请求将被拒绝。可设置全站共享额度，或按用户分配默认额度。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全局规则</CardTitle>
          <CardDescription>
            「全站共享」：全部用户共用同一额度池。「按用户默认」：未单独配置的用户各自使用下方额度。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="quota-mode">额度模式</FieldLabel>
              <select
                id="quota-mode"
                className="border-input bg-background h-9 w-full max-w-md rounded-md border px-3 text-sm"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as 'shared' | 'per_user_default')
                }
              >
                <option value="shared">全站共享</option>
                <option value="per_user_default">按用户默认</option>
              </select>
              <FieldDescription>
                {mode === 'shared'
                  ? '本月全站用量累加，共用下方额度。'
                  : '每位用户独立累计；未单独配置时使用下方额度。'}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="global-limit">月度 Token 额度</FieldLabel>
              <Input
                id="global-limit"
                className="max-w-md"
                value={globalLimit}
                onChange={(e) => setGlobalLimit(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="global-note">备注</FieldLabel>
              <Input
                id="global-note"
                className="max-w-md"
                value={globalNote}
                onChange={(e) => setGlobalNote(e.target.value)}
              />
            </Field>
          </FieldGroup>
          {globalUsed !== null ? (
            <p className="text-sm text-muted-foreground">
              本月已用（全站合计）：{globalUsed.toLocaleString('zh-CN')}
            </p>
          ) : null}
          <div>
            <Button type="button" disabled={savingGlobal} onClick={() => void saveGlobal()}>
              {savingGlobal ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              保存全局规则
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户专属额度</CardTitle>
          <CardDescription>
            可为指定用户设置独立额度；配置后该用户不再适用全局规则。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="quota-user">用户标识</FieldLabel>
              <Input
                id="quota-user"
                className="max-w-md"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="用户 ID"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-limit">月度 Token 额度</FieldLabel>
              <Input
                id="user-limit"
                className="max-w-md"
                value={userLimit}
                onChange={(e) => setUserLimit(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-note">备注</FieldLabel>
              <Input
                id="user-note"
                className="max-w-md"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
              />
            </Field>
          </FieldGroup>
          {userUsed !== null ? (
            <p className="text-sm text-muted-foreground">
              该用户本月已用：{userUsed.toLocaleString('zh-CN')}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void loadOne()}>
              查询
            </Button>
            <Button type="button" disabled={savingUser} onClick={() => void saveUser()}>
              {savingUser ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              保存专属额度
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>已配置的专属额度</CardTitle>
            <CardDescription>仅显示已单独设置额度的用户</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {loading ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircleIcon />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户标识</TableHead>
                <TableHead>月度额度</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.user_id}
                  className="cursor-pointer"
                  onClick={() => {
                    setUserId(r.user_id)
                    setUserLimit(String(r.token_limit))
                    setUserNote(r.note || '')
                    setUserUsed(null)
                  }}
                >
                  <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                  <TableCell>{r.token_limit.toLocaleString('zh-CN')}</TableCell>
                  <TableCell>{r.note || '—'}</TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    暂无专属配置，当前均适用全局规则
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}