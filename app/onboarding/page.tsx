"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, createProfile } from "@/lib/mocks/auth"
import { RoleCard } from "@/components/ui/RoleCard"
import { Button } from "@/components/ui/Button"
import type { Role } from "@/lib/types"

type Step = "role" | "vehicle"

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>("role")
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [licensePlate, setLicensePlate] = useState("")
  const [vehicleColor, setVehicleColor] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
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
      else router.replace("/app/conductor/taxi")
    }
  }, [user, profile, loading, router])

  function handleContinueRole() {
    if (selectedRole === "pasajero") {
      handleFinish()
    } else if (selectedRole === "taxista") {
      setStep("vehicle")
    }
  }

  async function handleFinish() {
    if (!user || !selectedRole) return

    if (selectedRole === "taxista") {
      const plate = licensePlate.trim().toUpperCase()
      const color = vehicleColor.trim()
      if (plate.length < 3) {
        setError("Ingresa una placa válida.")
        return
      }
      if (color.length < 3) {
        setError("Ingresa un color del vehículo.")
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const nombre = user.email.split("@")[0]

      const result = await createProfile(user.id, {
        user_id: user.id,
        nombre,
        telefono: null,
        role: selectedRole,
        license_plate:
          selectedRole === "taxista" ? licensePlate.trim().toUpperCase() : null,
        vehicle_color:
          selectedRole === "taxista" ? vehicleColor.trim() : null,
        vehicle_model:
          selectedRole === "taxista" && vehicleModel.trim()
            ? vehicleModel.trim()
            : null,
        photo_url: null,
      })

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar tu perfil.")
        return
      }

      if (selectedRole === "pasajero") {
        router.replace("/app/pasajero")
      } else {
        router.replace("/app/conductor/taxi")
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
              : "Datos de tu vehículo"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "role"
              ? "Esta decisión no se puede cambiar. Para cambiar de rol, debes borrar tu perfil."
              : "Los pasajeros ven estos datos cuando aceptas un viaje. Tienen que coincidir con la realidad."}
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
              description="Quiero ver taxis cercanos y pedir un viaje cuando lo necesite."
              icon="🧍"
              selected={selectedRole === "pasajero"}
              onClick={() => setSelectedRole("pasajero")}
            />
            <RoleCard
              title="Taxista"
              description="Manejo un taxi y quiero recibir solicitudes de pasajeros cercanos."
              icon="🚕"
              selected={selectedRole === "taxista"}
              onClick={() => setSelectedRole("taxista")}
            />
          </div>
        )}

        {/* Paso 2: datos del vehiculo (solo taxistas) */}
        {step === "vehicle" && (
          <div className="space-y-4 flex-1">
            <div>
              <label
                htmlFor="plate"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Placa del taxi
              </label>
              <input
                id="plate"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={10}
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="HBA 1234"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                           transition-colors text-base uppercase tracking-wider"
              />
            </div>

            <div>
              <label
                htmlFor="color"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Color del vehículo
              </label>
              <input
                id="color"
                type="text"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="Blanco, amarillo, rojo..."
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                           transition-colors text-base"
              />
            </div>

            <div>
              <label
                htmlFor="model"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Modelo <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                id="model"
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Toyota Yaris, Hyundai Accent..."
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                           transition-colors text-base"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger bg-danger/5 rounded-xl px-4 py-2.5 mt-4">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-8 space-y-3">
          {step === "role" && (
            <Button
              size="lg"
              className="w-full"
              disabled={!selectedRole}
              loading={saving}
              onClick={handleContinueRole}
            >
              {selectedRole === "taxista" ? "Continuar" : "Confirmar"}
            </Button>
          )}

          {step === "vehicle" && (
            <>
              <Button
                size="lg"
                className="w-full"
                disabled={!licensePlate.trim() || !vehicleColor.trim()}
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
