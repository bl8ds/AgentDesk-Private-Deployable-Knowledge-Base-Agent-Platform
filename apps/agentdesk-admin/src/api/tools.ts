import { apiFetch } from './client'

export type ToolKind = 'builtin' | 'http'

export type ToolParam = {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array'
  description?: string
  enum?: string[]
}

export type ToolInputSchema = {
  type?: string
  properties?: Record<string, ToolParam>
  required?: string[]
}

export type AgentTool = {
  id?: string
  name: string
  label: string
  description: string
  kind: ToolKind
  /** JSON string (Go stores raw JSON as text) */
  config: string
  input_schema: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export type ToolTestResult = {
  success: boolean
  data?: unknown
}

export function listTools() {
  return apiFetch<AgentTool[]>('/api/v1/admin/tools')
}

export function getTool(id: string) {
  return apiFetch<AgentTool>(`/api/v1/admin/tools/${id}`)
}

export function createTool(body: Partial<AgentTool>) {
  return apiFetch<AgentTool>('/api/v1/admin/tools', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateTool(id: string, body: Partial<AgentTool>) {
  return apiFetch<AgentTool>(`/api/v1/admin/tools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteTool(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/v1/admin/tools/${id}`, {
    method: 'DELETE',
  })
}

export function testTool(id: string, input: Record<string, unknown>) {
  return apiFetch<ToolTestResult>(`/api/v1/admin/tools/${id}/test`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

export const DEFAULT_HTTP_CONFIG = JSON.stringify(
  {
    method: 'GET',
    url: 'https://example.com/api?q={{query}}',
    headers: {},
    body: '',
    response_path: '',
    timeout_ms: 8000,
    max_output_chars: 4000,
  },
  null,
  2,
)

export const DEFAULT_INPUT_SCHEMA = JSON.stringify(
  {
    type: 'object',
    properties: {
      query: { type: 'string', description: '查询关键词' },
    },
    required: ['query'],
  },
  null,
  2,
)
