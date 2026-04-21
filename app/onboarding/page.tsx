"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, createProfile } from "@/lib/mocks/auth"
import { RoleCard } from "@/components/ui/RoleCard"
import { Button } from "@/components/ui/Button"
import type { Role, VehicleType } from "@/lib/types"

type Step = "role" | "vehicle"

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>("role")
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si ya tiene profile completo, redirigir
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (profile?.role) {
      if (profile.role === "pasajero") router.replace("/app/pasajero")
      else if (profile.vehicle_type === "taxi") router.replace("/app/conductor/taxi")
      else router.replace("/app/conductor/bus")
    }
  }, [user, profile, loading, router])

  async function handleFinish() {
    if (!user || !selectedRole) return
    if (selectedRole === "conductor" && !selectedVehicle) return

    setSaving(true)
    setError(null)

    try {
      const nombre = user.email.split("@")[0]

      const result = await createProfile(user.id, {
        user_id: user.id,
        nombre,
        telefono: null,
        role: selectedRole,
        vehicle_type: selectedRole === "conductor" ? selectedVehicle : null,
      })

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar tu perfil.")
        return
      }

      // Redirigir según rol
      if (selectedRole === "pasajero") {
        router.replace("/app/pasajero")
      } else if (selectedVehicle === "taxi") {
        router.replace("/app/conductor/taxi")
      } else {
        router.replace("/app/conductor/bus")
      }
    } catch (err) {
      console.error("Failed to create profile", err)
      setError("No se pudo guardar tu perfil. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col px-4 py-8 bg-background">
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl" aria-hidden="true">
              🚦
            </span>
            <span className="font-bold text-foreground">TimeRide</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mt-4">
            {step === "role"
              ? "Bienvenido. ¿Cómo vas a usar la app?"
              : "¿Qué tipo de vehículo manejas?"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "role"
              ? "Esta decisión no se puede cambiar. Para cambiar de rol, debes crear una nueva cuenta."
              : "Elige el tipo de transporte que operas."}
          </p>

          {/* Progress */}
          <div className="flex gap-2 mt-5" aria-label="Progreso">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div
              className={[
                "h-1 flex-1 rounded-full transition-colors",
                step === "vehicle" ? "bg-primary" : "bg-border",
              ].join(" ")}
            />
          </div>
        </div>

        {/* Paso 1: elegir rol */}
        {step === "role" && (
          <div className="space-y-3 flex-1">
            <RoleCard
              title="Pasajero"
              description="Quiero ver conductores cercanos y pedir taxis."
              icon="🧍"
              selected={selectedRole === "pasajero"}
              onClick={() => setSelectedRole("pasajero")}
            />
            <RoleCard
              title="Conductor"
              description="Opero un taxi, microbus o bus y quiero publicar mi ruta."
              icon="🚗"
              selected={selectedRole === "conductor"}
              onClick={() => setSelectedRole("conductor")}
            />
          </div>
        )}

        {/* Paso 2: elegir tipo de vehículo */}
        {step === "vehicle" && (
          <div className="space-y-3 flex-1">
            <RoleCard
              title="Taxi"
              description="Recibo solicitudes de ride de pasajeros."
              icon="🚕"
              selected={selectedVehicle === "taxi"}
              onClick={() => setSelectedVehicle("taxi")}
            />
            <RoleCard
              title="Microbus"
              description="Publico mi ruta y paradas en tiempo real."
              icon="🚐"
              selected={selectedVehicle === "microbus"}
              onClick={() => setSelectedVehicle("microbus")}
            />
            <RoleCard
              title="Bus"
              description="Publico mi ruta y paradas en tiempo real."
              icon="🚌"
              selected={selectedVehicle === "bus"}
              onClick={() => setSelectedVehicle("bus")}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger bg-danger/5 rounded-xl px-4 py-2.5 mt-4">
            {error}
          </p>
        )}

        {/* Footer con acciones */}
        <div className="mt-8 space-y-3">
          {step === "role" && (
            <>
              {selectedRole === "conductor" ? (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!selectedRole}
                  onClick={() => setStep("vehicle")}
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!selectedRole}
                  onClick={handleFinish}
                  loading={saving}
                >
                  Confirmar
                </Button>
              )}
            </>
          )}

          {step === "vehicle" && (
            <>
              <Button
                size="lg"
                className="w-full"
                disabled={!selectedVehicle}
                onClick={handleFinish}
                loading={saving}
              >
                Confirmar
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => setStep("role")}
              >
                Atrás
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
