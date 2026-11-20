import { apiFetch } from './client'

export type UsageDaily = {
  day: string
  total_tokens: number
  requests: number
  prompt_tokens: number
}

export type UsageByUser = {
  user_id: string
  total_tokens: number
  requests: number
}

export type UsageReport = {
  period: string
  total_tokens: number
  requests: number
  daily: UsageDaily[]
  top_users: UsageByUser[]
}

export type UsageEvent = {
  id: string
  user_id: string
  request_id: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  reasoning_tokens: number
  total_tokens: number
  created_at: string
}

export type UsagePage = {
  items: UsageEvent[]
  pagination: { page: number; page_size: number; total: number }
}

export function getUsageReport(days = 30, top = 10): Promise<UsageReport> {
  return apiFetch<UsageReport>(`/api/v1/admin/usage/report?days=${days}&top=${top}`)
}

export function listUsage(
  page = 1,
  pageSize = 20,
  filter: { user_id?: string; from?: string; to?: string } = {},
): Promise<UsagePage> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (filter.user_id) params.set('user_id', filter.user_id)
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  return apiFetch<UsagePage>(`/api/v1/admin/usage?${params.toString()}`)
}
