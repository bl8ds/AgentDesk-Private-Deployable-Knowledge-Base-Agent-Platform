/** Map oidc-client-ts / IdP raw errors to user-facing Chinese copy. */

export function mapAuthErrorMessage(raw: string | undefined | null): string {
  const msg = (raw || '').trim()
  if (!msg) return '登录未能完成，请重试。'

  if (/No matching state found in storage/i.test(msg)) {
    return '登录已过期或页面状态已失效，请重新登录。'
  }
  if (/state.*expired|expired.*state/i.test(msg)) {
    return '登录已过期，请重新登录。'
  }
  if (/access_denied|not allowed|insufficient|forbidden|不允许/i.test(msg)) {
    return '当前账号不具备访问权限。'
  }
  if (/login_required|interaction_required|consent_required/i.test(msg)) {
    return '需要重新完成登录。'
  }
  if (/network|failed to fetch|load failed|ERR_/i.test(msg)) {
    return '网络异常，请检查连接后重试。'
  }
  // Never surface raw English library / IdP strings on the page.
  if (/^[A-Za-z0-9_ .'":\-\[\]{}(),/]+$/.test(msg) && /[A-Za-z]{4,}/.test(msg)) {
    return '登录未能完成，请重试。'
  }
  return msg
}

export function isAccessDeniedError(raw: string | undefined | null): boolean {
  return /access_denied|not allowed|insufficient|forbidden|不允许/i.test(raw || '')
}