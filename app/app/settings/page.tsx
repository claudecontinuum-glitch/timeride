"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, clearMockSession } from "@/lib/mocks/auth"
import { Button } from "@/components/ui/Button"

const VEHICLE_LABEL: Record<string, string> = {
  taxi: "Taxi",
  microbus: "Microbus",
  bus: "Bus",
}

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteProfile() {
    if (!user) return
    setDeleting(true)

    try {
      // TODO Supabase: await supabase.from("profiles").delete().eq("user_id", user.id)
      // y luego supabase.auth.signOut()
      await new Promise((r) => setTimeout(r, 500))

      localStorage.removeItem(`timeride_profile_${user.id}`)
      clearMockSession()

      console.log("Mock: profile deleted for user", user.id)

      router.push("/signup")
    } finally {
      setDeleting(false)
    }
  }

  const rolDisplay =
    profile?.role === "pasajero"
      ? "Pasajero"
      : profile?.vehicle_type
      ? `Conductor — ${VEHICLE_LABEL[profile.vehicle_type] ?? profile.vehicle_type}`
      : "Conductor"

  return (
    <div className="flex flex-col min-h-full px-4 py-6 bg-background">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-xl font-bold text-foreground mb-6">
          Configuracion
        </h1>

        {/* Info de perfil */}
        <section
          aria-labelledby="profile-section"
          className="bg-surface rounded-2xl border border-border p-5 space-y-3 mb-6"
        >
          <h2
            id="profile-section"
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Tu perfil
          </h2>

          <div className="space-y-2">
            <ProfileRow label="Nombre" value={profile?.nombre ?? "—"} />
            <ProfileRow label="Correo" value={user?.email ?? "—"} />
            <ProfileRow label="Telefono" value={profile?.telefono ?? "No configurado"} />
            <ProfileRow label="Rol" value={rolDisplay} />
          </div>
        </section>

        {/* Zona de peligro */}
        <section
          aria-labelledby="danger-section"
          className="bg-surface rounded-2xl border border-danger/20 p-5"
        >
          <h2
            id="danger-section"
            className="text-sm font-semibold text-danger uppercase tracking-wide mb-3"
          >
            Zona de peligro
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            Borrar tu perfil elimina tu rol y toda tu informacion. Para cambiar
            de rol, esta es la unica opcion. Esta accion no se puede deshacer.
          </p>

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
                Estas seguro? Esta accion no se puede deshacer.
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
                  Si, borrar
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
    <div className="flex items-center justify-between py-1 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
