"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/mocks/auth"

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/login")
      return
    }

    if (!profile) {
      router.replace("/onboarding")
      return
    }

    if (profile.role === "pasajero") {
      router.replace("/app/pasajero")
      return
    }

    if (profile.role === "taxista") {
      router.replace("/app/conductor/taxi")
    }
  }, [user, profile, loading, router])

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <span className="text-foreground text-xl font-sans font-semibold tracking-tight">
          TimeRide
        </span>
        <p className="text-muted-foreground text-sm font-sans">Cargando...</p>
      </div>
    </div>
  )
}
