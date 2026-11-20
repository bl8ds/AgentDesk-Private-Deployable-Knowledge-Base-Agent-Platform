import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
  type AuthContextProps,
} from 'react-oidc-context'
import { oidcConfig, oidcEnabled } from './config'

const AuthContext = createContext<AuthContextProps | null>(null)

function OidcBridge({ children }: { children: ReactNode }) {
  const auth = useOidcAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!oidcEnabled) {
    return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
  }
  return (
    <OidcAuthProvider {...oidcConfig}>
      <OidcBridge>{children}</OidcBridge>
    </OidcAuthProvider>
  )
}

export function useAuth(): AuthContextProps | null {
  return useContext(AuthContext)
}