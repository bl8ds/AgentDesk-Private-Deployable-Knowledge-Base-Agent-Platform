import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircleIcon,
  FlaskConicalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  WrenchIcon,
} from 'lucide-react'
import {
  createTool,
  DEFAULT_HTTP_CONFIG,
  DEFAULT_INPUT_SCHEMA,
  deleteTool,
  listTools,
  testTool,
  updateTool,
  type AgentTool,
} from '../api/tools'
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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const emptyTool: AgentTool = {
  name: '',
  label: '',
  description: '',
  kind: 'http',
  config: DEFAULT_HTTP_CONFIG,
  input_schema: DEFAULT_INPUT_SCHEMA,
  enabled: true,
}

const inputClass =
  'border-input bg-background placeholder:text-muted-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/30'
const textareaClass = `${inputClass} h-auto min-h-28 py-2 font-mono text-xs`

export function ToolsPage() {
  const [tools, setTools] = useState<AgentTool[]>([])
  const [draft, setDraft] = useState<AgentTool>(emptyTool)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testToolRow, setTestToolRow] = useState<AgentTool | null>(null)
  const [testInput, setTestInput] = useState('{\n  "query": "示例"\n}')
  const [testOutput, setTestOutput] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTools(await listTools())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载工具列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof Error ? err.message : fallback)
    setOk(null)
  }

  const resetDraft = () => {
    setDraft(emptyTool)
    setEditingId(null)
  }

  const saveTool = async () => {
    if (!draft.name.trim()) {
      setError('工具标识不能为空')
      return
    }
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      // Validate JSON before sending so users get a clear, local error.
      JSON.parse(draft.config)
      JSON.parse(draft.input_schema)
      const body: Partial<AgentTool> = {
        name: draft.name.trim().toLowerCase(),
        label: draft.label.trim() || draft.name.trim(),
        description: draft.description.trim(),
        kind: draft.kind,
        config: draft.config,
        input_schema: draft.input_schema,
        enabled: draft.enabled,
      }
      if (editingId) {
        await updateTool(editingId, body)
        setOk('工具已更新，下一次对话请求即生效（最长 15 秒缓存）。')
      } else {
        await createTool(body)
        setOk('工具已创建。')
      }
      resetDraft()
      await refresh()
    } catch (err) {
      fail(err, '保存工具失败（请检查 JSON 格式）')
    } finally {
      setBusy(false)
    }
  }

  const removeTool = async (tool: AgentTool) => {
    setBusy(true)
    try {
      await deleteTool(tool.id!)
      setOk('工具已删除')
      await refresh()
    } catch (err) {
      fail(err, '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const toggleTool = async (tool: AgentTool) => {
    setBusy(true)
    try {
      const updated = await updateTool(tool.id!, { enabled: !tool.enabled })
      setTools((prev) => prev.map((t) => (t.id === tool.id ? updated : t)))
      setOk(updated.enabled ? '工具已启用' : '工具已停用')
    } catch (err) {
      fail(err, '切换状态失败')
    } finally {
      setBusy(false)
    }
  }

  const runTest = async () => {
    if (!testToolRow?.id) return
    setBusy(true)
    setError(null)
    setTestOutput(null)
    try {
      const input = JSON.parse(testInput) as Record<string, unknown>
      const res = await testTool(testToolRow.id, input)
      setTestOutput(res.success ? res.data : { error: '执行失败' })
    } catch (err) {
      fail(err, '测试失败（请检查输入 JSON）')
    } finally {
      setBusy(false)
    }
  }

  const builtinCount = tools.filter((t) => t.kind === 'builtin').length
  const httpCount = tools.filter((t) => t.kind === 'http').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Agent 工具</h2>
        <p className="text-sm text-muted-foreground">
          注册工具后，对话模型可在需要时自主调用：内置工具开箱即用，HTTP 工具可对接任意内部 API。
          改动最长 15 秒后在对话中生效，无需重启服务。
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {ok ? (
        <Alert>
          <AlertTitle>已更新</AlertTitle>
          <AlertDescription>{ok}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> 正在加载工具…
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">内置 {builtinCount}</Badge>
        <Badge variant="secondary">HTTP {httpCount}</Badge>
        <Badge variant="outline">启用 {tools.filter((t) => t.enabled).length}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>已注册工具</CardTitle>
          <CardDescription>
            内置工具不可删除，可停用；HTTP 工具可自由增删改。工具名即模型看到的 toolName。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工具标识</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>说明</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    暂无工具。
                  </TableCell>
                </TableRow>
              ) : (
                tools.map((tool) => (
                  <TableRow key={tool.id ?? tool.name}>
                    <TableCell className="font-medium">
                      <div>{tool.name}</div>
                      {tool.label && tool.label !== tool.name ? (
                        <div className="text-xs text-muted-foreground">{tool.label}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tool.kind === 'builtin' ? 'default' : 'secondary'}>
                        {tool.kind === 'builtin' ? '内置' : 'HTTP'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {tool.description || '—'}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-xs underline-offset-2 hover:underline"
                        disabled={busy}
                        onClick={() => void toggleTool(tool)}
                      >
                        {tool.enabled ? '已启用' : '已停用'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTestToolRow(tool)
                            setTestOutput(null)
                          }}
                        >
                          测试
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(tool.id ?? null)
                            setDraft({ ...tool })
                          }}
                        >
                          编辑
                        </Button>
                        {tool.kind === 'http' && tool.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => void removeTool(tool)}
                          >
                            <Trash2Icon />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? '编辑工具' : '新增工具'}</CardTitle>
          <CardDescription>
            内置工具保持默认配置即可；HTTP 工具用 {'{{参数名}}'} 占位符把输入参数插入 URL、请求头或请求体。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="tool-name">工具标识</FieldLabel>
              <Input
                id="tool-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="如：query_order"
              />
              <FieldDescription>小写字母开头，仅字母/数字/下划线。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="tool-label">显示名称</FieldLabel>
              <Input
                id="tool-label"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="如：订单查询"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="tool-desc">工具描述（模型据此决定何时调用）</FieldLabel>
            <textarea
              id="tool-desc"
              className={`${textareaClass} min-h-16`}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="查询指定订单的状态与明细…"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="tool-kind">类型</FieldLabel>
              <select
                id="tool-kind"
                className={inputClass}
                value={draft.kind}
                disabled={Boolean(editingId && draft.kind === 'builtin')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: e.target.value as AgentTool['kind'],
                    config:
                      e.target.value === 'http' ? DEFAULT_HTTP_CONFIG : draft.config,
                  })
                }
              >
                <option value="http">HTTP 接口</option>
                <option value="builtin">内置工具</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="tool-enabled">状态</FieldLabel>
              <select
                id="tool-enabled"
                className={inputClass}
                value={draft.enabled ? 'on' : 'off'}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.value === 'on' })}
              >
                <option value="on">启用</option>
                <option value="off">停用</option>
              </select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="tool-config">工具配置（JSON）</FieldLabel>
            <textarea
              id="tool-config"
              className={textareaClass}
              value={draft.config}
              onChange={(e) => setDraft({ ...draft, config: e.target.value })}
              spellCheck={false}
            />
            <FieldDescription>
              HTTP：method / url / headers / body / response_path / timeout_ms / max_output_chars。
              内置：{'{"builtin":"current_time"}'} 或 {'{"builtin":"knowledge_search"}'}。
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="tool-schema">输入参数（JSON Schema）</FieldLabel>
            <textarea
              id="tool-schema"
              className={textareaClass}
              value={draft.input_schema}
              onChange={(e) => setDraft({ ...draft, input_schema: e.target.value })}
              spellCheck={false}
            />
            <FieldDescription>
              支持 string / number / boolean / array 与 required 列表；工具调用参数由此校验。
            </FieldDescription>
          </Field>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void saveTool()}>
              {editingId ? <SaveIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              {editingId ? '保存修改' : '添加工具'}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetDraft}>
                取消编辑
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>工具测试</CardTitle>
          <CardDescription>
            用示例参数直接执行一次工具（走 Agent 运行时，与真实调用同一实现），不影响线上对话数据。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="test-tool-select">选择工具</FieldLabel>
            <select
              id="test-tool-select"
              className={inputClass}
              value={testToolRow?.id ?? ''}
              onChange={(e) => {
                const found = tools.find((t) => t.id === e.target.value) ?? null
                setTestToolRow(found)
                setTestOutput(null)
                if (found?.kind === 'builtin' && found.name === 'current_time') {
                  setTestInput('{}')
                }
              }}
            >
              <option value="">请选择…</option>
              {tools.map((tool) => (
                <option key={tool.id ?? tool.name} value={tool.id}>
                  {tool.name}（{tool.kind === 'builtin' ? '内置' : 'HTTP'}）
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="test-input">输入参数（JSON）</FieldLabel>
            <textarea
              id="test-input"
              className={`${textareaClass} min-h-20`}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              spellCheck={false}
            />
          </Field>
          <div>
            <Button
              type="button"
              size="sm"
              disabled={busy || !testToolRow?.id}
              onClick={() => void runTest()}
            >
              {busy ? <Spinner data-icon="inline-start" /> : <FlaskConicalIcon data-icon="inline-start" />}
              运行工具
            </Button>
          </div>
          {testOutput != null ? (
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <WrenchIcon className="size-4" />
                返回结果
              </div>
              <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                {JSON.stringify(testOutput, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
