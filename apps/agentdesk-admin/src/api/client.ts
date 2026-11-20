import { apiBaseUrl } from '../auth/config'
import { ApiError, type ApiSuccess, type ProblemDetail } from './types'

let accessTokenGetter: (() => string | null) | null = null

export function setAccessTokenGetter(fn: () => string | null) {
  accessTokenGetter = fn
}

export function getAccessToken(): string | null {
  return accessTokenGetter?.() ?? null
}

async function parseProblem(res: Response): Promise<ProblemDetail | null> {
  try {
    return (await res.json()) as ProblemDetail
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (!token) {
    throw new ApiError(401, null, 'authentication required')
  }
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const url = `${apiBaseUrl()}${path}`
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    const problem = await parseProblem(res)
    throw new ApiError(
      res.status,
      problem,
      problem?.detail || problem?.title || `请求失败 (${res.status})`,
    )
  }

  if (res.status === 204) {
    return undefined as T
  }

  const json = (await res.json()) as ApiSuccess<T>
  return json.data
}