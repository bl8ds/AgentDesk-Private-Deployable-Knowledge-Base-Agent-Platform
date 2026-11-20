import { apiBaseUrl } from '../auth/config'
import { apiFetch, getAccessToken } from './client'
import type { Document, ListResult } from './types'

export async function listDocs(
  page = 1,
  pageSize = 20,
  status = '',
): Promise<ListResult<Document>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  return apiFetch<ListResult<Document>>(`/api/v1/docs?${params.toString()}`)
}

export type StatusCount = { status: string; count: number }

export function getDocStatusCounts(): Promise<{ counts: StatusCount[] }> {
  return apiFetch<{ counts: StatusCount[] }>('/api/v1/docs/status-counts')
}

export type DocChunk = {
  id: string
  document_id: string
  chunk_index: number
  content: string
  created_at: string
}

export function listDocChunks(id: string): Promise<{ chunks: DocChunk[] }> {
  return apiFetch<{ chunks: DocChunk[] }>(`/api/v1/docs/${encodeURIComponent(id)}/chunks`)
}

export async function uploadDoc(file: File): Promise<{ document: Document }> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<{ document: Document }>('/api/v1/docs', {
    method: 'POST',
    body: form,
  })
}

export async function deleteDoc(id: string): Promise<void> {
  await apiFetch(`/api/v1/docs/${id}`, { method: 'DELETE' })
}

export async function reprocessDoc(id: string): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(`/api/v1/docs/${id}/reprocess`, {
    method: 'POST',
  })
}

/** Authenticated blob for in-app preview (images / pdf / text). */
export async function fetchDocContentBlob(id: string): Promise<{
  blob: Blob
  contentType: string
}> {
  const t = getAccessToken()
  if (!t) throw new Error('authentication required')
  const res = await fetch(`${apiBaseUrl()}/api/v1/docs/${id}/content`, {
    headers: { Authorization: `Bearer ${t}` },
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`预览失败 (${res.status})`)
  }
  const contentType =
    res.headers.get('Content-Type') || 'application/octet-stream'
  const blob = await res.blob()
  return { blob, contentType }
}