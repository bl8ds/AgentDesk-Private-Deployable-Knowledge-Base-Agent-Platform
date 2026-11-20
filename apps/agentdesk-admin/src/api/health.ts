import { apiFetch } from './client'

export type SystemHealth = {
  status: 'ok' | 'degraded'
  db: 'up' | 'down'
  redis: 'up' | 'down'
  agent: 'up' | 'down'
}

export function getSystemHealth(): Promise<SystemHealth> {
  return apiFetch<SystemHealth>('/api/v1/admin/system/health')
}
