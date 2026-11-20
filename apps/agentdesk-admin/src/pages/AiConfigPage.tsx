import { useCallback, useEffect, useState } from 'react'
import { AlertCircleIcon, SaveIcon } from 'lucide-react'
import {
  getAiSettings,
  putAiSettings,
  type AiSettings,
} from '../api/aiSettings'
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
import { Spinner } from '@/components/ui/spinner'

const empty: AiSettings = {
  chat_base_url: '',
  chat_model: '',
  embedding_base_url: '',
  embedding_model: '',
  vision_base_url: '',
  vision_model: '',
  retrieval_top_k: 4,
  snippet_max_chars: 240,
  chat_key_set: false,
  embedding_key_set: false,
  vision_key_set: false,
  configured: false,
}

export function AiConfigPage() {
  const [form, setForm] = useState<AiSettings>(empty)
  const [chatKey, setChatKey] = useState('')
  const [embeddingKey, setEmbeddingKey] = useState('')
  const [visionKey, setVisionKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAiSettings()
      setForm({ ...empty, ...data })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载模型配置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setField = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const body: Record<string, unknown> = {
        chat_base_url: form.chat_base_url,
        chat_model: form.chat_model,
        embedding_base_url: form.embedding_base_url,
        embedding_model: form.embedding_model,
        vision_base_url: form.vision_base_url,
        vision_model: form.vision_model,
        retrieval_top_k: Number(form.retrieval_top_k) || 4,
        snippet_max_chars: Number(form.snippet_max_chars) || 240,
      }
      if (chatKey.trim()) body.chat_api_key = chatKey.trim()
      if (embeddingKey.trim()) body.embedding_api_key = embeddingKey.trim()
      if (visionKey.trim()) body.vision_api_key = visionKey.trim()
      const data = await putAiSettings(body)
      setForm({ ...empty, ...data })
      setChatKey('')
      setEmbeddingKey('')
      setVisionKey('')
      setOk('配置已保存，约 15 秒内生效。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">模型配置</h2>
          <p className="text-sm text-muted-foreground">
            配置 OpenAI 兼容接口的地址、模型名称与访问密钥。
            {!form.configured ? (
              <span className="mt-1 block text-destructive">
                配置未完成：请补全对话、向量与视觉模型后，知识库与智能问答方可正常使用。
              </span>
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving || loading}
          onClick={() => void save()}
        >
          {saving ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          保存配置
        </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>对话模型</CardTitle>
          <CardDescription>
            用于智能问答，接口须兼容 OpenAI Chat Completions。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="chat-base">接口地址</FieldLabel>
              <Input
                id="chat-base"
                value={form.chat_base_url}
                onChange={(e) => setField('chat_base_url', e.target.value)}
                placeholder="https://example.com/v1"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="chat-model">对话模型</FieldLabel>
              <Input
                id="chat-model"
                value={form.chat_model}
                onChange={(e) => setField('chat_model', e.target.value)}
                placeholder="模型 ID"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="chat-key">API Key</FieldLabel>
              <Input
                id="chat-key"
                type="password"
                autoComplete="new-password"
                value={chatKey}
                onChange={(e) => setChatKey(e.target.value)}
                placeholder={
                  form.chat_key_set ? '已保存，留空则不修改' : '请输入 API Key'
                }
              />
              <FieldDescription>
                {form.chat_key_set ? '密钥已加密保存' : '尚未配置密钥'}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>向量模型</CardTitle>
          <CardDescription>
            用于文档入库与检索，接口须兼容 OpenAI Embeddings。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="emb-base">接口地址</FieldLabel>
              <Input
                id="emb-base"
                value={form.embedding_base_url}
                onChange={(e) => setField('embedding_base_url', e.target.value)}
                placeholder="https://example.com/v1"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="emb-model">模型名称</FieldLabel>
              <Input
                id="emb-model"
                value={form.embedding_model}
                onChange={(e) => setField('embedding_model', e.target.value)}
                placeholder="嵌入模型 ID"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="emb-key">API Key</FieldLabel>
              <Input
                id="emb-key"
                type="password"
                autoComplete="new-password"
                value={embeddingKey}
                onChange={(e) => setEmbeddingKey(e.target.value)}
                placeholder={
                  form.embedding_key_set
                    ? '已保存，留空则不修改'
                    : '请输入 API Key'
                }
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>视觉模型</CardTitle>
          <CardDescription>
            用于图片文档文字提取，接口须兼容 OpenAI 多模态 Chat Completions。请按实际算力选择合适模型。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="vis-base">接口地址</FieldLabel>
              <Input
                id="vis-base"
                value={form.vision_base_url}
                onChange={(e) => setField('vision_base_url', e.target.value)}
                placeholder="https://example.com/v1"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="vis-model">模型名称</FieldLabel>
              <Input
                id="vis-model"
                value={form.vision_model}
                onChange={(e) => setField('vision_model', e.target.value)}
                placeholder="视觉模型 ID"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="vis-key">API Key</FieldLabel>
              <Input
                id="vis-key"
                type="password"
                autoComplete="new-password"
                value={visionKey}
                onChange={(e) => setVisionKey(e.target.value)}
                placeholder={
                  form.vision_key_set ? '已保存，留空则不修改' : '请输入 API Key'
                }
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>检索参数</CardTitle>
          <CardDescription>控制回答引用的片段数量与长度。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="top-k">召回条数</FieldLabel>
              <Input
                id="top-k"
                value={String(form.retrieval_top_k)}
                onChange={(e) =>
                  setField('retrieval_top_k', Number(e.target.value) || 0)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="snip">引用片段最大字数</FieldLabel>
              <Input
                id="snip"
                value={String(form.snippet_max_chars)}
                onChange={(e) =>
                  setField('snippet_max_chars', Number(e.target.value) || 0)
                }
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}