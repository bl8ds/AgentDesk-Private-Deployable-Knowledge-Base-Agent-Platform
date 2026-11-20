import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { OAuthCallbackPage } from './auth/OAuthCallbackPage'
import { HostedRedirect } from './auth/HostedRedirect'
import { AuthStatus } from './auth/AuthStatus'
import { hardSignOut, isAdminUser } from './auth/config'
import { requestOidcLoginPrompt } from './auth/oidcPrompt'
import { setAccessTokenGetter } from './api/client'
import { DocumentListPage } from './pages/DocumentListPage'
import { QuotaPage } from './pages/QuotaPage'
import { AiConfigPage } from './pages/AiConfigPage'
import { ToolsPage } from './pages/ToolsPage'
import { CompliancePage } from './pages/CompliancePage'
import { AuditPage } from './pages/AuditPage'
import { UsageDashboardPage } from './pages/UsageDashboardPage'
import { UsageListPage } from './pages/UsageListPage'
import { SessionsPage } from './pages/SessionsPage'
import { SystemHealthPage } from './pages/SystemHealthPage'
import { AppShell } from './components/AppShell'
import { Spinner } from '@/components/ui/spinner'
import { usePathname } from './lib/router'

function AuthedRoutes() {
  const auth = useAuth()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  setAccessTokenGetter(() => auth.user?.access_token ?? null)

  const isAdmin = isAdminUser(auth.user)

  if (auth.isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner />
        <p>正在检查登录状态…</p>
      </div>
    )
  }

  if (!auth.isAuthenticated) return <HostedRedirect />

  if (!auth.user?.access_token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner />
        <p>正在准备会话…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <AuthStatus
        title="无权访问"
        description="当前账号不具备管理后台访问权限，请使用管理员账号登录。"
        actionLabel="使用其他账号"
        busy={signingOut}
        onAction={() => {
          setSigningOut(true)
          requestOidcLoginPrompt()
          void hardSignOut({
            signoutRedirect: () => auth.signoutRedirect(),
            removeUser: () => auth.removeUser(),
          }).catch(() => setSigningOut(false))
        }}
      />
    )
  }

  let page = <DocumentListPage />
  if (pathname === '/quotas') page = <QuotaPage />
  else if (pathname === '/settings/ai') page = <AiConfigPage />
  else if (pathname === '/settings/tools') page = <ToolsPage />
  else if (pathname === '/settings/compliance') page = <CompliancePage />
  else if (pathname === '/audit') page = <AuditPage />
  else if (pathname === '/usage') page = <UsageDashboardPage />
  else if (pathname === '/usage/list') page = <UsageListPage />
  else if (pathname === '/sessions') page = <SessionsPage />
  else if (pathname === '/system/health') page = <SystemHealthPage />

  return <AppShell>{page}</AppShell>
}

export default function App() {
  const isCallback = window.location.pathname === '/oauth/callback'

  return (
    <AuthProvider>
      {isCallback ? <OAuthCallbackPage /> : <AuthedRoutes />}
    </AuthProvider>
  )
}