import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircleIcon,
  FlaskConicalIcon,
  PlusIcon,
  SaveIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  createSensitiveTerm,
  deleteSensitiveTerm,
  getComplianceSettings,
  listSensitiveTerms,
  putComplianceSettings,
  testComplianceText,
  updateSensitiveTerm,
  type ComplianceCheckResult,
  type ComplianceSettings,
  type SensitiveTerm,
} from '../api/compliance'
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

const defaultSettings: ComplianceSettings = {
  input_action: 'block',
  output_action: 'redact',
  mask: '***',
  refuse_without_evidence: true,
  refusal_template:
    '抱歉，当前知识库中没有足够依据回答这个问题。请补充相关资料后再试，或联系管理员。',
  low_confidence_hint: '以上内容仅供参考，请结合原始资料核实。',
}

const emptyTerm: SensitiveTerm = {
  term: '',
  level: 'block',
  category: '',
  suggestion: '',
  enabled: true,
}

const inputClass =
  'border-input bg-background placeholder:text-muted-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/30'

export function CompliancePage() {
  const [settings, setSettings] = useState<ComplianceSettings>(defaultSettings)
  const [terms, setTerms] = useState<SensitiveTerm[]>([])
  const [draft, setDraft] = useState<SensitiveTerm>(emptyTerm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<ComplianceCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, t] = await Promise.all([
        getComplianceSettings(),
        listSensitiveTerms(),
      ])
      setSettings({ ...defaultSettings, ...s })
      setTerms(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载合规配置失败')
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

  const saveSettings = async () => {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const data = await putComplianceSettings(settings)
      setSettings({ ...defaultSettings, ...data })
      setOk('策略已保存，下一次对话请求即生效。')
    } catch (err) {
      fail(err, '保存策略失败')
    } finally {
      setBusy(false)
    }
  }

  const saveTerm = async () => {
    if (!draft.term.trim()) {
      setError('敏感词不能为空')
      return
    }
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const body: Partial<SensitiveTerm> = {
        term: draft.term.trim(),
        level: draft.level,
        category: draft.category.trim(),
        suggestion: draft.suggestion.trim(),
        enabled: draft.enabled,
      }
      if (editingId) {
        await updateSensitiveTerm(editingId, body)
        setOk('敏感词已更新')
      } else {
        await createSensitiveTerm(body)
        setOk('敏感词已添加')
      }
      setDraft(emptyTerm)
      setEditingId(null)
      await refresh()
    } catch (err) {
      fail(err, '保存敏感词失败')
    } finally {
      setBusy(false)
    }
  }

  const removeTerm = async (id: string) => {
    setBusy(true)
    try {
      await deleteSensitiveTerm(id)
      setOk('敏感词已删除')
      await refresh()
    } catch (err) {
      fail(err, '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const runTest = async () => {
    if (!testText.trim()) return
    setBusy(true)
    setError(null)
    try {
      setTestResult(await testComplianceText(testText))
    } catch (err) {
      fail(err, '测试失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">内容安全与拒答策略</h2>
        <p className="text-sm text-muted-foreground">
          配置敏感词库与拦截级别；命中 block 级词条时拒绝回答，warn 级给出提示。无检索依据时可启用自动拒答。
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
          <Spinner /> 正在加载配置…
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>拦截策略</CardTitle>
          <CardDescription>输入检测在调用模型前执行；输出脱敏在流式返回时执行。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="input-action">输入命中策略</FieldLabel>
              <select
                id="input-action"
                className={inputClass}
                value={settings.input_action}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    input_action: e.target.value as ComplianceSettings['input_action'],
                  })
                }
              >
                <option value="off">不处理</option>
                <option value="warn">提示但继续</option>
                <option value="block">拦截并拒答</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="output-action">输出命中策略</FieldLabel>
              <select
                id="output-action"
                className={inputClass}
                value={settings.output_action}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    output_action: e.target.value as ComplianceSettings['output_action'],
                  })
                }
              >
                <option value="off">不处理</option>
                <option value="warn">仅提示</option>
                <option value="redact">替换为掩码</option>
              </select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="mask">输出掩码</FieldLabel>
            <Input
              id="mask"
              value={settings.mask}
              onChange={(e) => setSettings({ ...settings, mask: e.target.value })}
              placeholder="***"
            />
            <FieldDescription>输出脱敏时用于替换敏感词文本。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="refusal">
              <span className="flex items-center gap-2">
                <input
                  id="refusal"
                  type="checkbox"
                  checked={settings.refuse_without_evidence}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      refuse_without_evidence: e.target.checked,
                    })
                  }
                />
                无检索依据时自动拒答
              </span>
            </FieldLabel>
            <FieldDescription>检索为空时直接返回拒答话术，不调用对话模型。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="refusal-template">拒答话术</FieldLabel>
            <textarea
              id="refusal-template"
              className={`${inputClass} min-h-20`}
              value={settings.refusal_template}
              onChange={(e) =>
                setSettings({ ...settings, refusal_template: e.target.value })
              }
            />
          </Field>
          <div>
            <Button type="button" size="sm" disabled={busy} onClick={() => void saveSettings()}>
              {busy ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
              保存策略
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>敏感词库</CardTitle>
          <CardDescription>匹配不区分大小写；block 级命中即拒绝，warn 级仅提示。当前共 {terms.length} 条。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field>
              <FieldLabel htmlFor="term">敏感词</FieldLabel>
              <Input
                id="term"
                value={draft.term}
                onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                placeholder="如：绝对最好"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="level">级别</FieldLabel>
              <select
                id="level"
                className={inputClass}
                value={draft.level}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    level: e.target.value as SensitiveTerm['level'],
                  })
                }
              >
                <option value="block">禁止</option>
                <option value="warn">警告</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="category">分类</FieldLabel>
              <Input
                id="category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="如：夸大宣传"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="suggestion">替代建议</FieldLabel>
              <Input
                id="suggestion"
                value={draft.suggestion}
                onChange={(e) => setDraft({ ...draft, suggestion: e.target.value })}
                placeholder="合规替代表述"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void saveTerm()}>
                {editingId ? <SaveIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
                {editingId ? '更新' : '添加'}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(null)
                    setDraft(emptyTerm)
                  }}
                >
                  取消
                </Button>
              ) : null}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>词条</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>替代建议</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    暂无敏感词，添加后即可生效。
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.term}</TableCell>
                    <TableCell>
                      <Badge variant={term.level === 'block' ? 'destructive' : 'secondary'}>
                        {term.level === 'block' ? '禁止' : '警告'}
                      </Badge>
                    </TableCell>
                    <TableCell>{term.category || '—'}</TableCell>
                    <TableCell>{term.suggestion || '—'}</TableCell>
                    <TableCell>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={term.enabled}
                          onChange={(e) => {
                            const next = { ...term, enabled: e.target.checked }
                            if (term.id) {
                              void updateSensitiveTerm(term.id, { enabled: next.enabled })
                                .then(() => setTerms((prev) => prev.map((x) => (x.id === term.id ? next : x))))
                                .catch((err) => fail(err, '更新状态失败'))
                            }
                          }}
                        />
                        {term.enabled ? '启用' : '停用'}
                      </label>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(term.id ?? null)
                            setDraft({ ...term })
                          }}
                        >
                          编辑
                        </Button>
                        {term.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => void removeTerm(term.id!)}
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
          <CardTitle>规则测试</CardTitle>
          <CardDescription>用一段文本验证命中结果与输出脱敏效果，不影响线上数据。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <textarea
            className={`${inputClass} min-h-24`}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="输入要检测的问题或回答文本…"
          />
          <div>
            <Button type="button" size="sm" disabled={busy || !testText.trim()} onClick={() => void runTest()}>
              <FlaskConicalIcon data-icon="inline-start" />
              运行检测
            </Button>
          </div>
          {testResult ? (
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheckIcon className="size-4" />
                <span className="font-medium">
                  {testResult.blocked ? '将拦截' : testResult.warned ? '将提示' : '未命中敏感词'}
                </span>
              </div>
              {testResult.matches.length ? (
                <ul className="mb-2 list-disc pl-5 text-muted-foreground">
                  {testResult.matches.map((m) => (
                    <li key={m.term}>
                      {m.term}（{m.level === 'block' ? '禁止' : '警告'}
                      {m.category ? ` · ${m.category}` : ''}）
                      {m.suggestion ? ` → ${m.suggestion}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="text-muted-foreground">脱敏结果：{testResult.redacted}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
