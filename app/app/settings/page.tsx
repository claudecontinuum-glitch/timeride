"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, deleteProfile, signOut } from "@/lib/mocks/auth"
import { Button } from "@/components/ui/Button"

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDeleteProfile() {
    if (!user) return
    setDeleting(true)
    setError(null)

    try {
      // Borrar profile primero (libera el rol para re-registro con misma cuenta)
      const deleteResult = await deleteProfile(user.id)
      if (!deleteResult.success) {
        setError(deleteResult.error ?? "No se pudo eliminar el perfil.")
        return
      }

      // Cerrar sesión
      await signOut()

      router.replace("/login")
    } catch (err) {
      console.error("Failed to delete profile and sign out", err)
      setError("Ocurrió un error. Intenta de nuevo.")
    } finally {
      setDeleting(false)
    }
  }

  const rolDisplay = profile?.role === "taxista" ? "Taxista" : "Pasajero"
  const isTaxista = profile?.role === "taxista"

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6 bg-background">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-xl font-bold text-foreground mb-6">Configuración</h1>

        {/* Info de perfil */}
        <section
          aria-labelledby="profile-section"
          className="bg-surface rounded-2xl border border-border p-5 space-y-3 mb-6"
        >
          <h2
            id="profile-section"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Tu perfil
          </h2>

          <div className="space-y-2">
            <ProfileRow label="Nombre" value={profile?.nombre ?? "—"} />
            <ProfileRow label="Correo" value={user?.email ?? "—"} />
            <ProfileRow
              label="Teléfono"
              value={profile?.telefono ?? "No configurado"}
            />
            <ProfileRow label="Rol" value={rolDisplay} />
          </div>
        </section>

        {isTaxista && (
          <section
            aria-labelledby="vehicle-section"
            className="bg-surface rounded-2xl border border-border p-5 space-y-3 mb-6"
          >
            <h2
              id="vehicle-section"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            >
              Tu vehículo
            </h2>

            <div className="space-y-2">
              <ProfileRow label="Placa" value={profile?.license_plate ?? "—"} />
              <ProfileRow label="Color" value={profile?.vehicle_color ?? "—"} />
              <ProfileRow
                label="Modelo"
                value={profile?.vehicle_model ?? "No configurado"}
              />
            </div>
          </section>
        )}

        {/* Zona de peligro */}
        <section
          aria-labelledby="danger-section"
          className="bg-surface rounded-2xl border border-danger/20 p-5"
        >
          <h2
            id="danger-section"
            className="text-xs font-semibold text-danger uppercase tracking-wide mb-3"
          >
            Zona de peligro
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            Borrar tu perfil elimina tu rol y configuración. Podrás volver a elegir rol con la misma cuenta. Esta acción no se puede deshacer.
          </p>

          {error && (
            <p role="alert" className="text-sm text-danger bg-danger/5 rounded-xl px-4 py-2.5 mb-3">
              {error}
            </p>
          )}

          {!confirming ? (
            <Button
              variant="danger"
              size="md"
              className="w-full"
              onClick={() => setConfirming(true)}
            >
              Borrar perfil
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground text-center">
                ¿Estás seguro? Esta acción no se puede deshacer.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setConfirming(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  loading={deleting}
                  onClick={handleDeleteProfile}
                >
                  Sí, borrar
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground truncate max-w-[160px] text-right">
        {value}
      </span>
    </div>
  )
}
