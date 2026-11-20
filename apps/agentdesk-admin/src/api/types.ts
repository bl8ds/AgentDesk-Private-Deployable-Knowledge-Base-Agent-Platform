export type Principal = {
  user_id: string
  level: string
  roles?: string[]
  channel?: string
}

export type Document = {
  id: string
  filename: string
  content_type?: string
  status: string
  error_message?: string
  uploaded_by?: string
  created_at?: string
  updated_at?: string
}

export type ListResult<T> = {
  items: T[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
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

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '待处理'
    case 'processing':
      return '处理中'
    case 'ready':
      return '已入库'
    case 'failed':
      return '处理失败'
    case 'deleted':
      return '已删除'
    default:
      return status || '未知'
  }
}

export function fileKindLabel(filename: string, contentType?: string): string {
  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
    : ''
  if (contentType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return '图片'
  }
  if (ext === 'pdf' || contentType === 'application/pdf') return 'PDF'
  if (ext === 'docx') return 'Word'
  if (ext === 'md') return 'Markdown'
  if (ext === 'txt') return '文本'
  return ext ? ext.toUpperCase() : '文件'
}