import { apiFetch } from './client'

export type AiSettings = {
  chat_base_url: string
  chat_model: string
  embedding_base_url: string
  embedding_model: string
  vision_base_url: string
  vision_model: string
  retrieval_top_k: number
  snippet_max_chars: number
  chat_key_set: boolean
  embedding_key_set: boolean
  vision_key_set: boolean
  updated_by?: string
  updated_at?: string
  configured: boolean
}

export function getAiSettings() {
  return apiFetch<AiSettings>('/api/v1/admin/ai-settings')
}

export function putAiSettings(body: Record<string, unknown>) {
  return apiFetch<AiSettings>('/api/v1/admin/ai-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}