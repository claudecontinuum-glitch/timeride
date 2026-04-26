"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Settings, LogOut } from "lucide-react"
import { useAuth, signOut } from "@/lib/mocks/auth"

function NavBar({ pathname }: { pathname: string }) {
  const { user, profile } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.replace("/login")
  }

  const roleLabel = profile?.role === "taxista" ? "Taxista" : "Pasajero"
  const homePath = profile?.role === "taxista" ? "/app/conductor/taxi" : "/app/pasajero"
  const isOnHome = pathname === homePath

  return (
    <nav className="relative z-30 flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
      <div className="flex items-center gap-3 min-w-0">
        {!isOnHome ? (
          <Link
            href={homePath}
            aria-label="Volver al mapa"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground/70 hover:text-foreground rounded-md hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        ) : (
          <Link href={homePath} aria-label="TimeRide" className="flex flex-col leading-none">
            <span
              className="font-sans text-foreground text-[15px] font-semibold tracking-tight"
            >
              TimeRide
            </span>
            <span className="font-sans text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft"
                aria-hidden="true"
              />
              <span className="truncate max-w-[140px]">
                {profile?.nombre ?? user?.email?.split("@")[0] ?? "—"}
              </span>
              <span className="text-tertiary-foreground">·</span>
              <span>{roleLabel}</span>
            </span>
          </Link>
        )}
        {!isOnHome && (
          <div className="leading-tight min-w-0">
            <p className="font-sans text-sm font-semibold text-foreground truncate max-w-[160px]">
              {profile?.nombre ?? user?.email?.split("@")[0] ?? "Usuario"}
            </p>
            <p className="font-sans text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/app/settings"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-surface-hover transition-colors"
          aria-label="Configuración"
        >
          <Settings size={17} strokeWidth={2} />
        </Link>
        <button
          onClick={handleLogout}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-surface-hover transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={17} strokeWidth={2} />
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
      <main className="flex-1 min-h-0 overflow-hidden relative">{children}</main>
    </div>
  )
}
