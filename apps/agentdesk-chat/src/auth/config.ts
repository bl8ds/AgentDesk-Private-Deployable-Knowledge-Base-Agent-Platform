import type { AuthProviderProps } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'

const issuer = import.meta.env.VITE_OIDC_ISSUER || 'https://auth.example.com'
const clientID = import.meta.env.VITE_OIDC_CLIENT_ID || 'agentdesk_chat_spa'

export const oidcEnabled = Boolean(clientID)

export const oauthRedirectURI = `${window.location.origin}/oauth/callback`

export const oidcConfig: AuthProviderProps = {
  authority: issuer,
  client_id: clientID,
  redirect_uri: oauthRedirectURI,
  // Must be listed in openauth oauth2_clients.allowed_logout_urls
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