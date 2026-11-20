import type { ReactNode } from 'react'
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from 'react-oidc-context'
import { oidcConfig } from './config'

export function AuthProvider({ children }: { children: ReactNode }) {
  return <OidcAuthProvider {...oidcConfig}>{children}</OidcAuthProvider>
}

export function useAuth() {
  return useOidcAuth()
}