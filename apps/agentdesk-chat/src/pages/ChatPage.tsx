import { useMemo } from 'react'
import { ChevronLeftIcon, LogOutIcon, MenuIcon, PlusIcon } from 'lucide-react'
import type { Principal } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { oidcEnabled } from '../auth/config'
import { requestOidcLoginPrompt } from '../auth/oidcPrompt'
import { AssistantChat } from '../components/AssistantChat'
import { HistorySheet } from '../components/HistoryPanel'
import { useChatStore } from '../store/chat'
import { Button } from '@/components/ui/button'

type Props = {
  principal: Principal
  onLogout?: () => void
}

function isEmbedded(): boolean {
  const q = new URLSearchParams(window.location.search)
  if (q.get('standalone') === '1') return false
  if (q.get('embed') === '1' || q.get('embedded') === '1') return true
  if (import.meta.env.VITE_EMBEDDED === '1' || import.meta.env.VITE_EMBEDDED === 'true') {
    return true
  }
  if (import.meta.env.VITE_EMBEDDED === '0' || import.meta.env.VITE_EMBEDDED === 'false') {
    return false
  }
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  // Top-level browser (OIDC demo): standalone so account switch is available.
  return false
}

/**
 * App WebView / iframe：通知宿主关闭或返回上一页。
 * 约定：`{ type: 'agentdesk:back' }`（postMessage）；可选再对接 JSBridge `close`。
 * 独立浏览器：history.back() 兜底。
 */
function handleBack() {
  const payload = { type: 'agentdesk:back' as const }
  try {
    window.parent.postMessage(payload, '*')
  } catch {
    /* ignore cross-origin */
  }
  try {
    const w = window as Window & {
      ReactNativeWebView?: { postMessage: (msg: string) => void }
      webkit?: { messageHandlers?: { agentdesk?: { postMessage: (msg: unknown) => void } } }
      AgentDeskBridge?: { close?: () => void; back?: () => void }
    }
    w.ReactNativeWebView?.postMessage(JSON.stringify(payload))
    w.webkit?.messageHandlers?.agentdesk?.postMessage(payload)
    if (typeof w.AgentDeskBridge?.close === 'function') w.AgentDeskBridge.close()
    else if (typeof w.AgentDeskBridge?.back === 'function') w.AgentDeskBridge.back()
  } catch {
    /* bridge optional */
  }
  if (window.history.length > 1) {
    window.history.back()
  }
}

export function ChatPage({ principal: _principal, onLogout }: Props) {
  void _principal
  const auth = useAuth()
  const embedded = useMemo(() => isEmbedded(), [])
  const clear = useChatStore((s) => s.clear)
  const sending = useChatStore((s) => s.sending)
  const setHistoryOpen = useChatStore((s) => s.setHistoryOpen)

  const switchAccount = () => {
    onLogout?.()
    if (!oidcEnabled || !auth) return
    // openauth end_session → origin → HostedRedirect with prompt=login
    requestOidcLoginPrompt()
    void auth.signoutRedirect().catch(async () => {
      try {
        await auth.removeUser()
      } catch {
        /* ignore */
      }
      window.location.assign(window.location.origin)
    })
  }

  return (
    <div className={embedded ? 'app-shell app-shell-embed' : 'app-shell'}>
      <div className="app-stage">
        <header className="app-header">
          <div className="app-header-side app-header-left">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="app-back"
              aria-label="返回"
              onClick={handleBack}
            >
              <ChevronLeftIcon />
            </Button>
          </div>

          <h1 className="app-title">AgentDesk</h1>

          <div className="app-header-side app-header-right">
            {!embedded && oidcEnabled ? (
              <button
                type="button"
                className="app-nav-action"
                aria-label="切换账号"
                title="切换账号"
                onClick={switchAccount}
              >
                <LogOutIcon />
              </button>
            ) : null}
            <button
              type="button"
              className="app-nav-action"
              aria-label="新建对话"
              disabled={sending}
              onClick={() => clear()}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              className="app-nav-action"
              aria-label="历史对话"
              onClick={() => setHistoryOpen(true)}
            >
              <MenuIcon />
            </button>
          </div>
        </header>

        <main className="app-main">
          <AssistantChat />
        </main>
      </div>

      <HistorySheet embedded={embedded} />
    </div>
  )
}