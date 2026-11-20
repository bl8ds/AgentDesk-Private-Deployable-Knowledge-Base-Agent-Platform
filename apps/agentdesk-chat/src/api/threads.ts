import { apiFetch } from './client'
import type { Citation } from './types'

export type ChatThread = {
  id: string
  title: string
  resourceId?: string
  createdAt?: string
  updatedAt?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function isoField(
  t: Record<string, unknown>,
  camel: string,
  snake: string,
): string | undefined {
  const raw = t[camel] ?? t[snake]
  if (raw == null || raw === '') return undefined
  if (raw instanceof Date) return raw.toISOString()
  const s = String(raw).trim()
  return s || undefined
}

function unwrapPayload(raw: unknown): unknown {
  let cur: unknown = raw
  for (let i = 0; i < 4; i++) {
    const obj = asRecord(cur)
    if (!obj) break
    if ('data' in obj) {
      cur = obj.data
      continue
    }
    if ('threads' in obj) {
      cur = obj.threads
      break
    }
    if ('messages' in obj) {
      cur = obj.messages
      break
    }
    break
  }
  return cur
}

function parseMaybeJson(content: unknown): unknown {
  if (typeof content !== 'string') return content
  const s = content.trim()
  if (!s.startsWith('{') && !s.startsWith('[')) return content
  try {
    return JSON.parse(s) as unknown
  } catch {
    return content
  }
}

export async function listThreads(): Promise<ChatThread[]> {
  const raw = await apiFetch<unknown>('/api/v1/chat/threads')
  const payload = unwrapPayload(raw)
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(asRecord(payload)?.threads)
      ? (asRecord(payload)!.threads as unknown[])
      : []

  const out: ChatThread[] = []
  for (const item of list) {
    const t = asRecord(item)
    if (!t) continue
    const id = String(t.id || t.threadId || '')
    if (!id) continue
    const rawTitle = String(t.title || '').trim()
    out.push({
      id,
      title: normalizeThreadTitle(rawTitle),
      resourceId: t.resourceId ? String(t.resourceId) : undefined,
      createdAt: isoField(t, 'createdAt', 'created_at'),
      updatedAt: isoField(t, 'updatedAt', 'updated_at'),
    })
  }
  return out
}

/** Placeholder titles from Mastra / old clients — treat as empty. */
export function isPlaceholderTitle(title?: string): boolean {
  const t = (title || '').trim()
  return !t || t === '新对话' || t === 'New Thread' || t === '未命名对话'
}

export function normalizeThreadTitle(title?: string): string {
  const t = (title || '').trim()
  if (isPlaceholderTitle(t)) return ''
  return t
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('标题不能为空')
  await apiFetch(`/api/v1/chat/threads/${encodeURIComponent(threadId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: trimmed.slice(0, 80) }),
  })
}

export type ThreadMessageRaw = {
  id?: string
  role?: string
  content?: unknown
  createdAt?: string
}

export type ThreadMessagesResult = {
  messages: ThreadMessageRaw[]
  /** Parallel to assistant turns (from thread metadata agentdesk_citation_turns). */
  citationTurns: Citation[][]
}

export async function getThreadMessages(
  threadId: string,
): Promise<ThreadMessagesResult> {
  const raw = await apiFetch<unknown>(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`,
  )
  const payload = unwrapPayload(raw)
  const root = asRecord(payload)
  let listRaw: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.messages)
      ? (root!.messages as unknown[])
      : []
  // Tolerate accidental nesting: { messages: { messages: [...] } }
  if (!listRaw.length && root?.messages && !Array.isArray(root.messages)) {
    const nested = asRecord(root.messages)
    if (Array.isArray(nested?.messages)) {
      listRaw = nested.messages as unknown[]
    }
  }
  const citationTurnsRaw = Array.isArray(root?.citation_turns)
    ? (root!.citation_turns as unknown[])
    : []

  const citationTurns: Citation[][] = citationTurnsRaw.map((turn) => {
    if (!Array.isArray(turn)) return []
    const cites: Citation[] = []
    for (const item of turn) {
      const o = asRecord(item)
      if (!o) continue
      cites.push({
        document_id: o.document_id ? String(o.document_id) : undefined,
        chunk_id: o.chunk_id ? String(o.chunk_id) : undefined,
        filename: o.filename ? String(o.filename) : undefined,
        content_type: o.content_type ? String(o.content_type) : undefined,
        snippet: o.snippet ? String(o.snippet) : undefined,
      })
    }
    return cites
  })

  const out: ThreadMessageRaw[] = []
  for (const item of listRaw) {
    const top = asRecord(item)
    if (!top) continue
    // Mastra sometimes nests under `.message`
    const nested = asRecord(top.message)
    const m = nested || top
    const role = String(m.role || top.role || '')
    const content =
      m.content !== undefined
        ? m.content
        : m.parts !== undefined
          ? { format: 2, parts: m.parts, content: m.text }
          : m.text !== undefined
            ? m.text
            : top.content
    out.push({
      id: String(m.id || top.id || ''),
      role: role || undefined,
      content,
      createdAt: m.createdAt
        ? String(m.createdAt)
        : top.createdAt
          ? String(top.createdAt)
          : undefined,
    })
  }
  return { messages: out, citationTurns }
}

/**
 * Mastra v2 message content:
 * { format:2, parts:[{type:'text',text},{type:'reasoning',reasoning}], content:'...' }
 */
export function extractMessageText(
  content: unknown,
): { text: string; reasoning?: string } {
  const parsed = parseMaybeJson(content)

  if (typeof parsed === 'string') {
    return { text: parsed }
  }

  const obj = asRecord(parsed)
  if (!obj) return { text: '' }

  // Prefer structured parts (Mastra format 2)
  if (Array.isArray(obj.parts)) {
    const texts: string[] = []
    const reasonings: string[] = []
    for (const part of obj.parts) {
      const p = asRecord(part)
      if (!p) continue
      const type = String(p.type || '')
      if (type === 'reasoning' || type === 'reasoning-delta') {
        if (typeof p.reasoning === 'string') reasonings.push(p.reasoning)
        else if (typeof p.text === 'string') reasonings.push(p.text)
        else if (typeof p.content === 'string') reasonings.push(p.content)
        continue
      }
      if (type === 'text' || type === 'output_text' || !type) {
        if (typeof p.text === 'string') texts.push(p.text)
        else if (typeof p.content === 'string') texts.push(p.content)
      }
    }
    let text = texts.join('')
    if (!text && typeof obj.content === 'string') text = obj.content
    return {
      text,
      reasoning: reasonings.length ? reasonings.join('') : undefined,
    }
  }

  // Array content (AI SDK style)
  if (Array.isArray(parsed)) {
    const texts: string[] = []
    const reasonings: string[] = []
    for (const part of parsed) {
      if (typeof part === 'string') {
        texts.push(part)
        continue
      }
      const p = asRecord(part)
      if (!p) continue
      const type = String(p.type || '')
      if (type === 'reasoning') {
        if (typeof p.reasoning === 'string') reasonings.push(p.reasoning)
        else if (typeof p.text === 'string') reasonings.push(p.text)
        continue
      }
      if (typeof p.text === 'string') texts.push(p.text)
    }
    return {
      text: texts.join(''),
      reasoning: reasonings.length ? reasonings.join('') : undefined,
    }
  }

  if (typeof obj.content === 'string') {
    return { text: obj.content }
  }
  if (typeof obj.text === 'string') {
    return { text: obj.text }
  }
  return { text: '' }
}

export function titleFromUserText(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return '未命名对话'
  return t.length > 28 ? `${t.slice(0, 28)}…` : t
}

export function displayThreadTitle(title?: string): string {
  const t = normalizeThreadTitle(title)
  return t || '未命名对话'
}