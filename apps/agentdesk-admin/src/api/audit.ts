import { apiFetch } from './client'

export type AuditLog = {
  id: string
  actor_id: string
  action: string
  resource_type: string
  resource_id: string
  meta: Record<string, unknown> | null
  created_at: string
}

export type AuditFilter = {
  action?: string
  actor_id?: string
  from?: string
  to?: string
}

export type AuditPage = {
  items: AuditLog[]
  pagination: { page: number; page_size: number; total: number }
}

export function listAudit(
  page = 1,
  pageSize = 20,
  filter: AuditFilter = {},
): Promise<AuditPage> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (filter.action) params.set('action', filter.action)
  if (filter.actor_id) params.set('actor_id', filter.actor_id)
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  return apiFetch<AuditPage>(`/api/v1/audit?${params.toString()}`)
}

export function listAuditActions(): Promise<{ actions: string[] }> {
  return apiFetch<{ actions: string[] }>('/api/v1/audit/actions')
}

/** Human-readable label for a machine action code. */
export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'chat.completions': '发起对话',
    'docs.upload': '上传文档',
    'docs.delete': '删除文档',
    'docs.reprocess': '重新处理',
    'quota.update_global': '修改全局配额',
    'quota.update_user': '修改用户配额',
    'ai_settings.update': '修改模型配置',
  }
  return map[action] || action
}
