import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { hardSignOut } from './config'
import { AuthStatus } from './AuthStatus'
import { mapAuthErrorMessage } from './errors'
import { requestOidcLoginPrompt } from './oidcPrompt'
import { Spinner } from '@/components/ui/spinner'

export function OAuthCallbackPage() {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const redirected = useRef(false)

  useEffect(() => {
    if (auth.error) return
    if (auth.isAuthenticated && !redirected.current) {
      redirected.current = true
      window.location.replace('/')
    }
  }, [auth.error, auth.isAuthenticated])

  const retry = () => {
    setBusy(true)
    requestOidcLoginPrompt()
    void hardSignOut({
      signoutRedirect: () => auth.signoutRedirect(),
      removeUser: () => auth.removeUser(),
    }).catch(() => setBusy(false))
  }

  if (auth.error) {
    return (
      <AuthStatus
        title="登录失败"
        description={mapAuthErrorMessage(auth.error.message)}
        actionLabel="重新登录"
        onAction={retry}
        busy={busy}
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner />
      <p>正在完成登录…</p>
    </div>
  )
}