import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { oidcEnabled } from './config'
import { oidcSigninRedirectArgs, requestOidcLoginPrompt } from './oidcPrompt'

type Props = {
  authError: string | null
}

/** Demo OIDC: bounce to openauth Hosted Login (production App uses ?code= exchange). */
export function HostedRedirect({ authError }: Props) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const errMsg = authError || auth?.error?.message || ''

  useEffect(() => {
    if (!oidcEnabled || !auth) return
    if (auth.isLoading || auth.isAuthenticated || auth.error || started.current) {
      return
    }
    started.current = true
    setBusy(true)
    void auth.signinRedirect(oidcSigninRedirectArgs()).catch(() => {
      setBusy(false)
      started.current = false
    })
  }, [auth])

  const retry = () => {
    if (!auth) return
    started.current = false
    setBusy(true)
    requestOidcLoginPrompt()
    void auth.signoutRedirect().catch(() => {
      void auth.removeUser().finally(() => {
        window.location.assign(window.location.origin)
      })
    })
  }

  if (!oidcEnabled) {
    return (
      <div className="center">
        <p>请从AgentDesk App 打开</p>
        {authError ? <p className="errorText">{authError}</p> : null}
      </div>
    )
  }

  if (errMsg) {
    return (
      <div className="center" style={{ gap: 12, maxWidth: 360, padding: 24 }}>
        <p className="errorText">{errMsg}</p>
        <button type="button" className="btn" onClick={retry}>
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="center">
      <p>{busy || auth?.isLoading ? '正在跳转至认证中心…' : '准备登录…'}</p>
    </div>
  )
}