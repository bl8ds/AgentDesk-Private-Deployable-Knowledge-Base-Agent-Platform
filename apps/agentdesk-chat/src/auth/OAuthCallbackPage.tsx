import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { requestOidcLoginPrompt } from './oidcPrompt'

function mapAuthErrorMessage(raw: string | undefined | null): string {
  const msg = (raw || '').trim()
  if (!msg) return '登录未能完成，请重试。'
  if (/No matching state found in storage/i.test(msg)) {
    return '登录已过期或页面状态已失效，请重新登录。'
  }
  if (/state.*expired|expired.*state/i.test(msg)) {
    return '登录已过期，请重新登录。'
  }
  if (/access_denied|not allowed|insufficient|forbidden/i.test(msg)) {
    return '当前账号不具备访问权限。'
  }
  if (/^[A-Za-z0-9_ .'":\-\[\]{}(),/]+$/.test(msg) && /[A-Za-z]{4,}/.test(msg)) {
    return '登录未能完成，请重试。'
  }
  return msg
}

function restartLogin(auth: NonNullable<ReturnType<typeof useAuth>>) {
  requestOidcLoginPrompt()
  void auth.removeUser().finally(() => {
    window.location.assign('/')
  })
}

export function OAuthCallbackPage() {
  const auth = useAuth()
  const [message, setMessage] = useState('正在完成登录…')
  const [canRetry, setCanRetry] = useState(false)
  const redirected = useRef(false)

  useEffect(() => {
    if (!auth) {
      setMessage('OIDC 未启用')
      return
    }
    if (auth.error) {
      setMessage(mapAuthErrorMessage(auth.error.message))
      setCanRetry(true)
      // Auto-recover: clear stale OIDC state and bounce to Hosted Login.
      const t = window.setTimeout(() => restartLogin(auth), 1600)
      return () => window.clearTimeout(t)
    }
    if (auth.isAuthenticated && !redirected.current) {
      redirected.current = true
      window.location.replace('/')
    }
  }, [auth, auth?.error, auth?.isAuthenticated])

  return (
    <div className="center" style={{ gap: 12, maxWidth: 360, padding: 24 }}>
      <p>{message}</p>
      {canRetry && auth ? (
        <button type="button" className="btn" onClick={() => restartLogin(auth)}>
          重新登录
        </button>
      ) : null}
    </div>
  )
}