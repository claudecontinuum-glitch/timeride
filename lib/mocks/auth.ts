"use client"

import { useEffect, useState } from "react"
import type { MockUser, Profile } from "@/lib/types"

export interface AuthState {
  user: MockUser | null
  profile: Profile | null
  loading: boolean
}

/**
 * Mock de auth que lee el cookie timeride_mock_user (JSON).
 * Cuando Supabase este listo, reemplazar por useSession() de @supabase/ssr.
 * La forma del objeto devuelto (user, profile, loading) es identica a lo que
 * devolveria un hook real con Supabase Auth.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  useEffect(() => {
    try {
      const raw = document.cookie
        .split("; ")
        .find((row) => row.startsWith("timeride_mock_user="))
        ?.split("=")
        .slice(1)
        .join("=")

      if (!raw) {
        setState({ user: null, profile: null, loading: false })
        return
      }

      const decoded = decodeURIComponent(raw)
      const session = JSON.parse(decoded) as {
        user: MockUser
        profile: Profile | null
      }

      setState({ user: session.user, profile: session.profile, loading: false })
    } catch (err) {
      console.error("Failed to parse mock auth cookie", err)
      setState({ user: null, profile: null, loading: false })
    }
  }, [])

  return state
}

/**
 * Escribe el cookie mock de sesion.
 * Formato identico al que Supabase escribiria internamente.
 */
export function setMockSession(user: MockUser, profile: Profile | null) {
  const value = encodeURIComponent(JSON.stringify({ user, profile }))
  const maxAge = 60 * 60 * 24 * 7 // 7 dias
  document.cookie = `timeride_mock_user=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/**
 * Borra el cookie mock de sesion (logout).
 */
export function clearMockSession() {
  document.cookie =
    "timeride_mock_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
}
