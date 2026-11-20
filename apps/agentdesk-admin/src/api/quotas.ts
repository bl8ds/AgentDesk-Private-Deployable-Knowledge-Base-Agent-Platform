import { apiFetch } from './client'

export type QuotaRow = {
  user_id: string
  token_limit: number
  note?: string
  updated_by?: string
  created_at?: string
  updated_at?: string
}

export type GlobalQuota = {
  mode: 'shared' | 'per_user_default'
  token_limit: number
  used_tokens: number
  note?: string
  updated_by?: string
  period?: string
}

export type EffectiveQuota = {
  scope: string
  user_id?: string
  mode?: string
  token_limit: number
  used_tokens: number
  note?: string
  period?: string
}

export function getGlobalQuota(): Promise<GlobalQuota> {
  return apiFetch<GlobalQuota>('/api/v1/admin/quotas/global')
}

export function putGlobalQuota(body: {
  mode: 'shared' | 'per_user_default'
  token_limit: number
  note?: string
}): Promise<GlobalQuota> {
  return apiFetch<GlobalQuota>('/api/v1/admin/quotas/global', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function listQuotas(limit = 100): Promise<QuotaRow[]> {
  return apiFetch<QuotaRow[]>(`/api/v1/admin/quotas?limit=${limit}`)
}

export function getQuota(userId: string): Promise<EffectiveQuota> {
  return apiFetch<EffectiveQuota>(`/api/v1/admin/quotas/${encodeURIComponent(userId)}`)
}

export function upsertQuota(
  userId: string,
  body: { token_limit: number; note?: string },
): Promise<QuotaRow> {
  return apiFetch<QuotaRow>(`/api/v1/admin/quotas/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}