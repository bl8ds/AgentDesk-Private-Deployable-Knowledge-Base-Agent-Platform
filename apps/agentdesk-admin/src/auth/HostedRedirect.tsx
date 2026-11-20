import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { hardSignOut } from './config'
import { AuthStatus } from './AuthStatus'
import { isAccessDeniedError, mapAuthErrorMessage } from './errors'
import { oidcSigninRedirectArgs, requestOidcLoginPrompt } from './oidcPrompt'
import { Spinner } from '@/components/ui/spinner'

/** No product login UI — bounce to openauth Hosted Login (or show IdP errors). */
export function HostedRedirect() {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const errMsg = auth.error?.message ?? ''
  const accessDenied = isAccessDeniedError(errMsg)

  useEffect(() => {
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

  const retryOtherAccount = () => {
    started.current = false
    setBusy(true)
    requestOidcLoginPrompt()
    void hardSignOut({
      signoutRedirect: () => auth.signoutRedirect(),
      removeUser: () => auth.removeUser(),
    }).catch(() => setBusy(false))
  }

  if (accessDenied) {
    return (
      <AuthStatus
        title="无权访问"
        description="当前账号不具备管理后台访问权限，请使用管理员账号登录。"
        actionLabel="使用其他账号"
        onAction={retryOtherAccount}
        busy={busy}
      />
    )
  }

  if (auth.error) {
    return (
      <AuthStatus
        title="登录失败"
        description={mapAuthErrorMessage(errMsg)}
        actionLabel="重新登录"
        onAction={retryOtherAccount}
        busy={busy}
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner />
      <p>{busy || auth.isLoading ? '正在跳转至认证中心…' : '准备登录…'}</p>
    </div>
  )
}