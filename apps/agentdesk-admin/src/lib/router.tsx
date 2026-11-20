import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'

export function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return pathname
}

export function navigate(to: string) {
  if (window.location.pathname === to) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

type LinkProps = {
  href: string
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

/** SPA link — prevents full document reload. */
export function Link({ href, children, className, onClick }: LinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return
        }
        e.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}

export function titleForPath(pathname: string): string {
  if (pathname === '/quotas') return '用量配额'
  if (pathname === '/settings/ai') return '模型配置'
  if (pathname === '/settings/tools') return 'Agent 工具'
  if (pathname === '/settings/compliance') return '内容安全'
  if (pathname === '/audit') return '审计日志'
  if (pathname === '/usage') return '用量看板'
  if (pathname === '/usage/list') return '用量明细'
  if (pathname === '/sessions') return '会话管理'
  if (pathname === '/system/health') return '系统健康'
  return '知识库文档'
}