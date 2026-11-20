import { apiFetch } from './client'
import type { Principal } from './types'

export async function fetchMe(): Promise<Principal> {
  return apiFetch<Principal>('/api/v1/auth/me')
}

export async function exchangeCode(code: string): Promise<Principal> {
  return apiFetch<Principal>('/api/v1/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}