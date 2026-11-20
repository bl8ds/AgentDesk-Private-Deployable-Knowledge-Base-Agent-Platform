import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { OAuthCallbackPage } from './auth/OAuthCallbackPage'
import { HostedRedirect } from './auth/HostedRedirect'
import { oidcEnabled } from './auth/config'
import { exchangeCode, fetchMe } from './api/auth'
import { setAccessTokenGetter } from './api/client'
import { setStreamTokenGetter } from './api/chat'
import { ApiError, type Principal } from './api/types'
import { ChatPage } from './pages/ChatPage'
import { requestOidcLoginPrompt } from './auth/oidcPrompt'

function AuthedApp() {
  const auth = useAuth()
  const [principal, setPrincipal] = useState<Principal | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const exchangeOnce = useRef(false)

  // Sync during render to avoid first-request 401 race with useEffect.
  const tokenGetter = () => auth?.user?.access_token ?? null
  setAccessTokenGetter(tokenGetter)
  setStreamTokenGetter(tokenGetter)

  const bootstrap = useCallback(async () => {
    setAuthLoading(true)
    setAuthError(null)

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    try {
      // App SSO: ?code= → session cookie (not OIDC authorize code on /oauth/callback)
      if (code && window.location.pathname !== '/oauth/callback') {
        if (!exchangeOnce.current) {
          exchangeOnce.current = true
          const me = await exchangeCode(code)
          setPrincipal(me)
          params.delete('code')
          const next = params.toString()
          const url = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
          window.history.replaceState({}, '', url)
        }
        return
      }

      // Prefer session cookie / Bearer already present
      try {
        const me = await fetchMe()
        setPrincipal(me)
        return
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) {
          throw err
        }
      }

      // OIDC: token in storage → /auth/me with Bearer
      if (oidcEnabled && auth?.user?.access_token) {
        const me = await fetchMe()
        setPrincipal(me)
        return
      }

      setPrincipal(null)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '鉴权失败')
      setPrincipal(null)
    } finally {
      setAuthLoading(false)
    }
  }, [auth?.user?.access_token])

  useEffect(() => {
    if (oidcEnabled && auth?.isLoading) return
    void bootstrap()
  }, [auth?.isLoading, bootstrap])

  if (authLoading || (oidcEnabled && auth?.isLoading)) {
    return (
      <div className="center">
        <p>正在检查登录状态…</p>
      </div>
    )
  }

  if (!principal) {
    // OIDC session exists but /auth/me failed — show error, do not re-redirect to IdP.
    if (oidcEnabled && auth?.isAuthenticated && auth.user?.access_token) {
      return (
        <div className="center" style={{ gap: 12, maxWidth: 420, padding: 24 }}>
          <p className="errorText">{authError || '已登录认证中心，但业务会话建立失败'}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              requestOidcLoginPrompt()
              void auth.signoutRedirect().catch(() => {
                void auth.removeUser().finally(() => {
                  window.location.assign(window.location.origin)
                })
              })
            }}
          >
            重新登录
          </button>
        </div>
      )
    }
    return <HostedRedirect authError={authError} />
  }

  return (
    <ChatPage
      principal={principal}
      onLogout={() => {
        setPrincipal(null)
        void bootstrap()
      }}
    />
  )
}

export default function App() {
  const isCallback = window.location.pathname === '/oauth/callback'

  return (
    <AuthProvider>
      {isCallback ? <OAuthCallbackPage /> : <AuthedApp />}
    </AuthProvider>
  )
}