import { apiBaseUrl } from '../auth/config'
import { normalizeCitation, type Citation } from './types'

export type ChatHandlers = {
  onToken: (text: string) => void
  onReasoning?: (text: string) => void
  onPhase?: (phase: string) => void
  onCitation: (citation: Citation) => void
  onUsage?: (usage: {
    total_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    reasoning_tokens?: number
    model?: string
  }) => void
  onConversationId?: (id: string) => void
  onComplianceBlocked?: (payload: Record<string, unknown>) => void
  onComplianceWarning?: (payload: Record<string, unknown>) => void
  onToolCall?: (payload: Record<string, unknown>) => void
  onToolResult?: (payload: Record<string, unknown>) => void
  onToolError?: (payload: Record<string, unknown>) => void
  onDone: () => void
  onError: (message: string) => void
}

function parseSseChunk(
  buffer: string,
  onEvent: (event: string, data: string) => void,
): string {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const block of parts) {
    if (!block.trim()) continue
    let event = 'message'
    const dataLines: string[] = []
    for (const rawLine of block.split('\n')) {
      const line = rawLine.replace(/\r$/, '')
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    onEvent(event, dataLines.join('\n'))
  }
  return rest
}

function parsePayload(raw: string): Record<string, unknown> {
  if (!raw) return {}
  try {
    let parsed: unknown = JSON.parse(raw)
    // Handle accidental double-encoding
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        return { content: parsed }
      }
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>
      // Some proxies wrap as { data: {...} }
      if (
        obj.data &&
        typeof obj.data === 'object' &&
        !Array.isArray(obj.data) &&
        (obj.snippet == null && obj.document_id == null)
      ) {
        return obj.data as Record<string, unknown>
      }
      return obj
    }
    return { content: String(parsed ?? '') }
  } catch {
    return { content: raw }
  }
}

function emitCitationPayload(
  payload: Record<string, unknown>,
  onCitation: (c: Citation) => void,
) {
  const nested = payload.citations
  if (Array.isArray(nested)) {
    for (const item of nested) {
      if (item && typeof item === 'object') {
        onCitation(normalizeCitation(item as Record<string, unknown>))
      }
    }
    return
  }
  // Ignore non-citation objects (e.g. accidental done payloads).
  if (
    payload.snippet == null &&
    payload.content == null &&
    payload.text == null &&
    payload.quote == null &&
    payload.document_id == null &&
    payload.documentId == null &&
    payload.chunk_id == null &&
    payload.chunkId == null
  ) {
    return
  }
  onCitation(normalizeCitation(payload))
}

let accessTokenGetter: (() => string | null) | null = null

export function setStreamTokenGetter(fn: (() => string | null) | null) {
  accessTokenGetter = fn
}

export async function streamChat(
  message: string,
  handlers: ChatHandlers,
  signal?: AbortSignal,
  conversationId?: string,
  think = true,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  const token = accessTokenGetter?.()
  if (token) headers.Authorization = `Bearer ${token}`

  const body: Record<string, unknown> = { message, think }
  if (conversationId) body.conversation_id = conversationId

  const res = await fetch(`${apiBaseUrl()}/api/v1/chat/completions`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let detail = `对话请求失败 (${res.status})`
    try {
      const problem = (await res.json()) as { detail?: string; title?: string }
      detail = problem.detail || problem.title || detail
    } catch {
      /* ignore */
    }
    handlers.onError(detail)
    return
  }

  if (!res.body) {
    handlers.onError('浏览器不支持流式响应')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false

  const handleEvent = (event: string, raw: string) => {
    const payload = parsePayload(raw)

    switch (event) {
      case 'token': {
        const text =
          (typeof payload.content === 'string' && payload.content) ||
          (typeof payload.token === 'string' && payload.token) ||
          ''
        if (text) handlers.onToken(text)
        break
      }
      case 'reasoning': {
        const text =
          (typeof payload.content === 'string' && payload.content) ||
          (typeof payload.text === 'string' && payload.text) ||
          ''
        if (text) handlers.onReasoning?.(text)
        break
      }
      case 'phase': {
        const phase =
          (typeof payload.phase === 'string' && payload.phase) ||
          (typeof payload.content === 'string' && payload.content) ||
          ''
        if (phase) handlers.onPhase?.(phase)
        break
      }
      case 'compliance_blocked':
        handlers.onComplianceBlocked?.(payload)
        break
      case 'compliance_warning':
        handlers.onComplianceWarning?.(payload)
        break
      case 'tool_call':
        handlers.onToolCall?.(payload)
        break
      case 'tool_result':
        handlers.onToolResult?.(payload)
        break
      case 'tool_error':
        handlers.onToolError?.(payload)
        break
      case 'usage':
        handlers.onUsage?.(payload)
        break
      case 'citation':
      case 'citations':
        emitCitationPayload(payload, handlers.onCitation)
        break
      case 'done': {
        const cid =
          typeof payload.conversation_id === 'string'
            ? payload.conversation_id
            : typeof payload.thread_id === 'string'
              ? payload.thread_id
              : null
        if (cid) handlers.onConversationId?.(cid)
        // Drain the rest of the stream; only fire onDone once.
        // (API may emit agent `done` then another `done` with conversation_id.)
        if (!finished) {
          finished = true
          handlers.onDone()
        }
        break
      }
      case 'error': {
        const msg =
          (typeof payload.message === 'string' && payload.message) ||
          (typeof payload.detail === 'string' && payload.detail) ||
          '对话出错'
        handlers.onError(msg)
        finished = true
        break
      }
      default:
        break
    }
  }

  // Do NOT break early on done — keep reading so trailing citation/done
  // events in the same or later chunks are not dropped.
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = parseSseChunk(buffer, handleEvent)
  }

  if (buffer.trim()) {
    parseSseChunk(buffer + '\n\n', handleEvent)
  }

  if (!finished) {
    handlers.onDone()
  }
}