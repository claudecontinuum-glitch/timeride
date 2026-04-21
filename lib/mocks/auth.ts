"use client"

/**
 * auth.ts — Real Supabase auth (reemplaza el mock de localStorage).
 * Mantiene las mismas firmas de export para que los pages existentes
 * importen sin cambios estructurales.
 */

import { useEffect, useState, useCallback } from "react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase"
import type { Profile } from "@/lib/types"

// ── Tipos públicos (iguales al mock anterior) ──────────────────────────────

export interface AuthState {
  user: { id: string; email: string } | null
  profile: Profile | null
  loading: boolean
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: { id: string; email: string }
  profile?: Profile | null
}

// ── Helpers de perfil ──────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseBrowser()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      // PGRST116 = no rows — normal cuando aun no hay profile
      console.error("Failed to fetch profile", error)
    }
    return null
  }

  return data as Profile
}

// ── Operaciones de auth ────────────────────────────────────────────────────

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabaseBrowser()

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    console.error("Signup failed", error)
    if (error.message.toLowerCase().includes("already registered")) {
      return { success: false, error: "Ya existe una cuenta con ese correo. Inicia sesión." }
    }
    return { success: false, error: "No se pudo crear la cuenta. Intenta de nuevo." }
  }

  if (!data.user) {
    return { success: false, error: "No se pudo crear la cuenta. Intenta de nuevo." }
  }

  return {
    success: true,
    user: { id: data.user.id, email: data.user.email ?? email },
    profile: null,
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabaseBrowser()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error("Signin failed", error)
    return { success: false, error: "Email o contraseña incorrectos." }
  }

  if (!data.user) {
    return { success: false, error: "Email o contraseña incorrectos." }
  }

  const profile = await fetchProfile(data.user.id)

  return {
    success: true,
    user: { id: data.user.id, email: data.user.email ?? email },
    profile,
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowser()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error("Signout failed", error)
  }
}

// ── Operaciones de profile ─────────────────────────────────────────────────

/**
 * Crea el profile de un usuario recien registrado.
 * Equivale al mock updateUserProfile + setMockSession del flow onboarding.
 */
export async function createProfile(
  userId: string,
  profileData: Omit<Profile, "id" | "created_at" | "role_locked_at">
): Promise<{ success: boolean; error?: string; profile?: Profile }> {
  const supabase = getSupabaseBrowser()

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      role: profileData.role,
      vehicle_type: profileData.vehicle_type ?? null,
      nombre: profileData.nombre,
      telefono: profileData.telefono ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create profile", error)
    return { success: false, error: "No se pudo guardar tu perfil. Intenta de nuevo." }
  }

  return { success: true, profile: data as Profile }
}

/**
 * Elimina el profile del usuario (para reset de rol).
 * La cuenta Supabase Auth queda — el usuario puede re-onboardear.
 */
export async function deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowser()

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", userId)

  if (error) {
    console.error("Failed to delete profile", error)
    return { success: false, error: "No se pudo eliminar el perfil." }
  }

  return { success: true }
}

// ── Compat stubs (usados por onboarding/settings) ─────────────────────────

/** @deprecated Usar createProfile directamente */
export function updateUserProfile(_userId: string, _profile: Profile): void {
  // No-op: reemplazado por createProfile en onboarding/page.tsx
}

/** @deprecated Usar signOut directamente */
export function clearMockSession(): void {
  // No-op: el signOut de Supabase limpia la sesión
}

/** @deprecated Usar signOut directamente */
export function setMockSession(_user: { id: string; email: string }, _profile: Profile | null): void {
  // No-op: la sesion la maneja Supabase SSR
}

/** @deprecated Usar deleteProfile + signOut directamente */
export function deleteUserById(_userId: string): void {
  // No-op
}

// ── useAuth hook ───────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  const resolveState = useCallback(async (userId: string, email: string) => {
    const profile = await fetchProfile(userId)
    setState({ user: { id: userId, email }, profile, loading: false })
  }, [])

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    // Leer sesión actual
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string; email?: string } | null } }) => {
      const user = data.user
      if (!user) {
        setState({ user: null, profile: null, loading: false })
        return
      }
      resolveState(user.id, user.email ?? "")
    })

    // Escuchar cambios de auth (login, logout, token refresh, sesión expirada)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!session?.user) {
          setState({ user: null, profile: null, loading: false })
          return
        }
        resolveState(session.user.id, session.user.email ?? "")
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [resolveState])

  return state
}
