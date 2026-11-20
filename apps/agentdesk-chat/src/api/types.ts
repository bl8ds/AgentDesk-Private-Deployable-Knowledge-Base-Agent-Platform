export type Principal = {
  user_id: string
  level: string
  roles?: string[]
  channel?: string
}

export type Citation = {
  document_id?: string
  chunk_id?: string
  filename?: string
  content_type?: string
  snippet?: string
  /** active | withdrawn — historical snapshot after corpus delete */
  source_status?: 'active' | 'withdrawn'
}

/** Normalize SSE / upstream citation payloads into a stable shape. */
export function normalizeCitation(raw: Record<string, unknown>): Citation {
  const snippet = String(
    raw.snippet ?? raw.content ?? raw.text ?? raw.quote ?? '',
  ).trim()
  const filename = String(
    raw.filename ?? raw.file_name ?? raw.fileName ?? '',
  ).trim()
  const contentType = String(
    raw.content_type ?? raw.contentType ?? raw.mime_type ?? '',
  ).trim()
  return {
    document_id:
      String(raw.document_id ?? raw.documentId ?? '').trim() || undefined,
    chunk_id: String(raw.chunk_id ?? raw.chunkId ?? '').trim() || undefined,
    filename: filename || undefined,
    content_type: contentType || undefined,
    snippet: snippet || undefined,
    source_status:
      raw.source_status === 'withdrawn' || raw.sourceStatus === 'withdrawn'
        ? 'withdrawn'
        : 'active',
  }
}

export function looksLikeImageCitation(c: {
  content_type?: string
  filename?: string
}): boolean {
  if (c.content_type?.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(c.filename || '')
}

export function looksLikeVideoCitation(c: {
  content_type?: string
  filename?: string
}): boolean {
  if (c.content_type?.startsWith('video/')) return true
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(c.filename || '')
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ProblemDetail = {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
}

export class ApiError extends Error {
  status: number
  body: ProblemDetail | null

  constructor(status: number, body: ProblemDetail | null, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function levelLabel(level: string): string {
  switch (level) {
    case 'vip':
      return 'VIP'
    case 'svip':
      return 'SVIP'
    case 'free':
      return '免费'
    default:
      return level || '未知'
  }
}