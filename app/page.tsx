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

    if (profile.role === "conductor") {
      const type = profile.vehicle_type
      if (type === "taxi") {
        router.replace("/app/conductor/taxi")
      } else {
        // bus y microbus usan la misma pantalla
        router.replace("/app/conductor/bus")
      }
    }
  }, [user, profile, loading, router])

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl" aria-hidden="true">
          🚦
        </span>
        <p className="text-muted-foreground text-sm">Cargando TimeRide...</p>
      </div>
    </div>
  )
}
