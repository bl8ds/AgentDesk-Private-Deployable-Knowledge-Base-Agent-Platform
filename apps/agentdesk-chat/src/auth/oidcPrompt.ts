/** openauth Hosted: only force prompt=login after explicit account switch. */

const STORAGE_KEY = 'agentdesk_oidc_prompt'

/** After end_session, next HostedRedirect should force password login. */
export function requestOidcLoginPrompt(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, 'login')
  } catch {
    /* ignore private mode */
  }
}

/** One-shot login flag; otherwise omit prompt (normal SSO). */
export function consumeOidcPrompt(): 'login' | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (v === 'login') return 'login'
  } catch {
    /* ignore */
  }
  return null
}

export function oidcSigninRedirectArgs(): {
  extraQueryParams?: { prompt: 'login' }
} {
  const prompt = consumeOidcPrompt()
  if (prompt === 'login') {
    return { extraQueryParams: { prompt: 'login' } }
  }
  return {}
}