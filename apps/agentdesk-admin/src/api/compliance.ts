import { apiFetch } from './client'

export type ComplianceSettings = {
  input_action: 'off' | 'warn' | 'block'
  output_action: 'off' | 'warn' | 'redact'
  mask: string
  refuse_without_evidence: boolean
  refusal_template: string
  low_confidence_hint: string
  updated_by?: string
  updated_at?: string
}

export type SensitiveTerm = {
  id?: string
  term: string
  level: 'warn' | 'block'
  category: string
  suggestion: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export type ComplianceMatch = {
  term: string
  level: string
  category?: string
  suggestion?: string
}

export type ComplianceCheckResult = {
  matches: ComplianceMatch[]
  blocked: boolean
  warned: boolean
  redacted?: string
}

export function getComplianceSettings() {
  return apiFetch<ComplianceSettings>('/api/v1/admin/compliance/settings')
}

export function putComplianceSettings(body: Partial<ComplianceSettings>) {
  return apiFetch<ComplianceSettings>('/api/v1/admin/compliance/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function listSensitiveTerms() {
  return apiFetch<SensitiveTerm[]>('/api/v1/admin/compliance/terms')
}

export function createSensitiveTerm(body: Partial<SensitiveTerm>) {
  return apiFetch<SensitiveTerm>('/api/v1/admin/compliance/terms', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateSensitiveTerm(id: string, body: Partial<SensitiveTerm>) {
  return apiFetch<SensitiveTerm>(`/api/v1/admin/compliance/terms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteSensitiveTerm(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/v1/admin/compliance/terms/${id}`, {
    method: 'DELETE',
  })
}

export function testComplianceText(text: string) {
  return apiFetch<ComplianceCheckResult>('/api/v1/admin/compliance/test', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}
