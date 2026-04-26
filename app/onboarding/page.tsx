"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Car } from "lucide-react"
import { useAuth, createProfile, updateVehicleInfo } from "@/lib/mocks/auth"
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

  // Detecta taxistas que tienen profile pero con datos placeholder (legado del pivote).
  // Esos perfiles deben quedarse en onboarding step 2 hasta que ingresen datos reales.
  const taxistaIncomplete =
    profile?.role === "taxista" &&
    (!profile.license_plate ||
      profile.license_plate === "PENDIENTE" ||
      profile.vehicle_color === "pendiente")

  // Si ya tiene profile completo, redirigir
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (profile?.role && !taxistaIncomplete) {
      if (profile.role === "pasajero") router.replace("/app/pasajero")
      else router.replace("/app/conductor/taxi")
    }
  }, [user, profile, loading, router, taxistaIncomplete])

  // Para taxistas con datos pendientes, saltar directo al step de vehicle.
  // Setea state post-await del fetch de profile; el linter no distingue, lo silenciamos.
  useEffect(() => {
    if (loading) return
    if (!taxistaIncomplete) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRole("taxista")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("vehicle")
  }, [taxistaIncomplete, loading])

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

      // Caso A: taxista existente con datos placeholder, hace UPDATE
      if (taxistaIncomplete) {
        const result = await updateVehicleInfo(user.id, {
          license_plate: licensePlate.trim().toUpperCase(),
          vehicle_color: vehicleColor.trim(),
          vehicle_model: vehicleModel.trim() || null,
        })

        if (!result.success) {
          setError(result.error ?? "No se pudo actualizar tu vehículo.")
          return
        }

        router.replace("/app/conductor/taxi")
        return
      }

      // Caso B: usuario nuevo, hace INSERT
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
          <span className="font-sans font-bold text-foreground tracking-tight text-lg">
            TimeRide
          </span>
          <h1 className="text-xl font-sans font-semibold text-foreground mt-4 leading-tight">
            {step === "role"
              ? "¿Cómo vas a usar la app?"
              : "Datos de tu vehículo"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground font-sans leading-snug">
            {step === "role"
              ? "Esta decisión no se puede cambiar. Para cambiar de rol, hay que borrar el perfil."
              : "Los pasajeros ven estos datos cuando aceptas un viaje. Tienen que coincidir con la realidad."}
          </p>

          {/* Progress */}
          <div className="flex gap-1.5 mt-5" aria-label="Progreso">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div
              className={[
                "h-1 flex-1 rounded-full transition-colors",
                step === "vehicle" ? "bg-primary" : "bg-border-strong",
              ].join(" ")}
            />
          </div>
        </div>

        {/* Paso 1: elegir rol */}
        {step === "role" && (
          <div className="space-y-2.5 flex-1">
            <RoleCard
              title="Pasajero"
              description="Quiero ver taxis cercanos y pedir un viaje cuando lo necesite."
              icon={<User size={20} strokeWidth={2} />}
              selected={selectedRole === "pasajero"}
              onClick={() => setSelectedRole("pasajero")}
            />
            <RoleCard
              title="Taxista"
              description="Manejo un taxi y quiero recibir solicitudes de pasajeros cercanos."
              icon={<Car size={20} strokeWidth={2} />}
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
