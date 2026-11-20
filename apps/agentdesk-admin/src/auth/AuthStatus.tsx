type AuthStatusProps = {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  busy?: boolean
}

/**
 * Full-viewport auth status — no Alert/card chrome.
 * Used for login failure, access denied, and role gate.
 */
export function AuthStatus({
  title,
  description,
  actionLabel,
  onAction,
  busy,
}: AuthStatusProps) {
  return (
    <div className="auth-status">
      <div className="auth-status-inner">
        <p className="auth-status-brand">AgentDesk</p>
        <h1 className="auth-status-title">{title}</h1>
        <p className="auth-status-desc">{description}</p>
        <button
          type="button"
          className="auth-status-action"
          disabled={busy}
          onClick={onAction}
        >
          {busy ? '请稍候…' : actionLabel}
        </button>
      </div>
    </div>
  )
}