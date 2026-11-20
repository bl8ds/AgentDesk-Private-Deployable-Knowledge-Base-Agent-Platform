import { apiFetch } from './client'

export type SessionRow = {
  id: string
  user_id: string
  level: string
  roles: string[]
  channel: string
  expires_at: string
  created_at: string
  updated_at: string
}

export function listSessions(limit = 100, userId = ''): Promise<{ sessions: SessionRow[] }> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (userId) params.set('user_id', userId)
  return apiFetch<{ sessions: SessionRow[] }>(`/api/v1/admin/sessions?${params.toString()}`)
}

export function revokeSession(id: string): Promise<{ revoked: boolean; id: string }> {
  return apiFetch<{ revoked: boolean; id: string }>(`/api/v1/admin/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
