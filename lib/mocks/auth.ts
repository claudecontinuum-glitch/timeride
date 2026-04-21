"use client"

import { useEffect, useState, useCallback } from "react"
import type { MockUser, Profile } from "@/lib/types"

// ── Storage keys ──────────────────────────────────────────────────────────────
const USERS_KEY = "timeride_users"
const SESSION_KEY = "timeride_session"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoredUser {
  id: string
  email: string
  passwordHash: string
  profile: Profile | null
}

export interface StoredSession {
  user_id: string
  email: string
  expires_at: string // ISO string
}

export interface AuthState {
  user: MockUser | null
  profile: Profile | null
  loading: boolean
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: MockUser
  profile?: Profile | null
}

// ── Hash simple (btoa) — NO es bcrypt real, solo ofusca el plaintext ──────────
// TODO Supabase: esto desaparece; Supabase maneja auth real

function hashPassword(password: string): string {
  // Ofuscamos con btoa + prefijo para que no quede plaintext obvio
  return `v1:${btoa(password)}`
}

function checkPassword(password: string, hash: string): boolean {
  return hash === hashPassword(password)
}

// ── Users array helpers ───────────────────────────────────────────────────────

export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as StoredUser[]
  } catch {
    return []
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return getStoredUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function findUserById(id: string): StoredUser | undefined {
  return getStoredUsers().find((u) => u.id === id)
}

export function updateUserProfile(userId: string, profile: Profile): void {
  const users = getStoredUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) return
  users[idx] = { ...users[idx], profile }
  saveStoredUsers(users)
}

export function deleteUserById(userId: string): void {
  const users = getStoredUsers().filter((u) => u.id !== userId)
  saveStoredUsers(users)
}

// ── Session helpers ───────────────────────────────────────────────────────────

export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    // Verificar que no expiró
    if (new Date(session.expires_at) < new Date()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function createSession(user: StoredUser): StoredSession {
  const session: StoredSession = {
    user_id: user.id,
    email: user.email,
    // 7 días
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  // También escribir el cookie para que proxy.ts / middleware funcionen
  const encoded = encodeURIComponent(JSON.stringify({ user: { id: user.id, email: user.email }, profile: user.profile }))
  document.cookie = `timeride_mock_user=${encoded}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  return session
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  document.cookie = "timeride_mock_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  // Emitir evento para sincronizar tabs
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY, newValue: null }))
  } catch {
    // no-op
  }
}

// ── Auth operations ───────────────────────────────────────────────────────────

export function signUp(email: string, password: string): AuthResult {
  const existing = findUserByEmail(email)
  if (existing) {
    return {
      success: false,
      error: "Ya existe una cuenta con ese correo. Inicia sesión.",
    }
  }

  const newUser: StoredUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    profile: null,
  }

  const users = getStoredUsers()
  users.push(newUser)
  saveStoredUsers(users)

  createSession(newUser)

  return {
    success: true,
    user: { id: newUser.id, email: newUser.email },
    profile: null,
  }
}

export function signIn(email: string, password: string): AuthResult {
  const user = findUserByEmail(email)
  if (!user) {
    return {
      success: false,
      error: "Email o contraseña incorrectos.",
    }
  }

  if (!checkPassword(password, user.passwordHash)) {
    return {
      success: false,
      error: "Email o contraseña incorrectos.",
    }
  }

  createSession(user)

  return {
    success: true,
    user: { id: user.id, email: user.email },
    profile: user.profile,
  }
}

export function signOut(): void {
  clearSession()
}

// ── Backward-compat helpers (usados por código existente en settings/layout) ──

export function setMockSession(user: MockUser, profile: Profile | null): void {
  // Actualiza el profile en el array de usuarios si el user existe
  if (profile) {
    updateUserProfile(user.id, profile)
  }
  // Escribe el cookie para el proxy
  const encoded = encodeURIComponent(JSON.stringify({ user, profile }))
  document.cookie = `timeride_mock_user=${encoded}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  // Actualizar sesión en localStorage con el profile fresco
  const session = getStoredSession()
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}

export function clearMockSession(): void {
  clearSession()
}

// ── useAuth hook ──────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  const resolveState = useCallback(() => {
    const session = getStoredSession()
    if (!session) {
      setState({ user: null, profile: null, loading: false })
      return
    }

    const storedUser = findUserById(session.user_id)
    if (!storedUser) {
      // Sesión huérfana — limpiar
      clearSession()
      setState({ user: null, profile: null, loading: false })
      return
    }

    setState({
      user: { id: storedUser.id, email: storedUser.email },
      profile: storedUser.profile,
      loading: false,
    })
  }, [])

  useEffect(() => {
    // Leer sesión al montar — queueMicrotask para evitar setState síncrono en effect
    queueMicrotask(resolveState)

    // Sincronizar cuando otra pestaña cambia localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY || e.key === USERS_KEY || e.key === null) {
        resolveState()
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [resolveState])

  return state
}
