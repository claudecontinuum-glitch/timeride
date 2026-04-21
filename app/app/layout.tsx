"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth, clearMockSession } from "@/lib/mocks/auth"

function NavBar() {
  const { user, profile } = useAuth()
  const router = useRouter()

  function handleLogout() {
    clearMockSession()
    try {
      localStorage.removeItem(`timeride_profile_${user?.id}`)
    } catch {
      // no-op
    }
    router.push("/login")
  }

  const roleLabel =
    profile?.role === "conductor"
      ? profile.vehicle_type === "taxi"
        ? "Taxista"
        : profile.vehicle_type === "microbus"
        ? "Microbusero"
        : "Busero"
      : "Pasajero"

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Inicio">
          <span className="text-xl" aria-hidden="true">
            🚦
          </span>
        </Link>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
            {profile?.nombre ?? user?.email?.split("@")[0] ?? "Usuario"}
          </p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/app/settings"
          className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="Configuracion"
        >
          ⚙️
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label="Cerrar sesion"
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
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, router, pathname])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-full bg-background">
      <NavBar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
