"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth, signOut } from "@/lib/mocks/auth"

function NavBar({ pathname }: { pathname: string }) {
  const { user, profile } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.replace("/login")
  }

  const roleLabel = profile?.role === "taxista" ? "Taxista" : "Pasajero"

  // Home segun rol — el mapa principal de cada uno
  const homePath = profile?.role === "taxista" ? "/app/conductor/taxi" : "/app/pasajero"

  // En la home no mostrar boton de volver
  const isOnHome = pathname === homePath

  return (
    <nav
      className="glass-surface flex items-center justify-between px-4 py-3 relative z-30"
      style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {!isOnHome ? (
          <Link
            href={homePath}
            aria-label="Volver al mapa"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-foreground/80 hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
        ) : (
          <Link href={homePath} aria-label="TimeRide" className="flex flex-col leading-none">
            <span
              className="font-display text-foreground text-xl font-semibold"
              style={{ letterSpacing: "0.12em" }}
            >
              TIMERIDE
            </span>
            <span className="font-sans text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-primary"
                style={{ boxShadow: "0 0 6px var(--color-primary-glow)" }}
                aria-hidden="true"
              />
              <span className="truncate max-w-[120px]">
                {profile?.nombre ?? user?.email?.split("@")[0] ?? "—"}
              </span>
              <span className="text-tertiary-foreground">·</span>
              <span>{roleLabel}</span>
            </span>
          </Link>
        )}
        {!isOnHome && (
          <div className="leading-tight min-w-0">
            <p className="font-sans text-sm font-semibold text-foreground truncate max-w-[140px]">
              {profile?.nombre ?? user?.email?.split("@")[0] ?? "Usuario"}
            </p>
            <p className="font-sans text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/app/settings"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Configuración"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
        <button
          onClick={handleLogout}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-xs font-sans text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors px-3"
          aria-label="Cerrar sesión"
        >
          Salir
        </button>
      </div>
    </nav>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (!profile) {
      router.replace("/onboarding")
      return
    }

    if (profile.role === "pasajero" && pathname.startsWith("/app/conductor")) {
      router.replace("/app/pasajero")
      return
    }
    if (profile.role === "taxista" && pathname === "/app/pasajero") {
      router.replace("/app/conductor/taxi")
      return
    }
  }, [user, profile, loading, router, pathname])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="font-sans text-muted-foreground text-sm">Cargando...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-full bg-background">
      <NavBar pathname={pathname} />
      <main className="flex-1 overflow-hidden relative">{children}</main>
    </div>
  )
}
