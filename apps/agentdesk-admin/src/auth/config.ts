import type { User } from 'oidc-client-ts'
import type { AuthProviderProps } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'

const issuer = import.meta.env.VITE_OIDC_ISSUER || 'https://auth.example.com'
const clientID = import.meta.env.VITE_OIDC_CLIENT_ID || 'agentdesk_admin_spa'

export const oauthRedirectURI = `${window.location.origin}/oauth/callback`

export const oidcConfig: AuthProviderProps = {
  authority: issuer,
  client_id: clientID,
  redirect_uri: oauthRedirectURI,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email offline_access',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

export const authMeta = {
  issuer,
  clientID,
}

/** Unset/empty → same-origin (`/api/...`). Vite drops empty env, so do not fall back to a private Host. */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return ''
  }
  return String(raw).replace(/\/+$/, '')
}

function rolesFromClaims(claims: Record<string, unknown> | undefined): string[] {
  if (!claims) return []
  const out: string[] = []
  if (typeof claims.role === 'string' && claims.role) out.push(claims.role)
  if (Array.isArray(claims.roles)) {
    for (const r of claims.roles) {
      if (typeof r === 'string' && r) out.push(r)
    }
  }
  return out
}

function accessTokenClaims(accessToken: string): Record<string, unknown> {
  const part = accessToken.split('.')[1]
  if (!part) return {}
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const json = new TextDecoder().decode(
    Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
  )
  return JSON.parse(json) as Record<string, unknown>
}

/**
 * oidc-client-ts exposes id_token claims as `user.profile`.
 * openauth puts IAM `roles` on the access_token (not OIDC profile).
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  const fromProfile = rolesFromClaims(user.profile as Record<string, unknown>)
  if (fromProfile.some((r) => r === 'admin' || r === 'platform_admin')) return true
  if (!user.access_token) return false
  try {
    return rolesFromClaims(accessTokenClaims(user.access_token)).some(
      (r) => r === 'admin' || r === 'platform_admin',
    )
  } catch {
    return false
  }
}

export async function hardSignOut(opts: {
  signoutRedirect: () => Promise<void>
  removeUser: () => Promise<void>
}): Promise<void> {
  try {
    await opts.signoutRedirect()
  } catch {
    try {
      await opts.removeUser()
    } catch {
      /* ignore */
    }
    window.location.assign(window.location.origin)
  }
}