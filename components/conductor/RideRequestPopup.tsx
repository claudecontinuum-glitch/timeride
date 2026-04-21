"use client"

import { Button } from "@/components/ui/Button"
import type { RideRequest } from "@/lib/types"

interface RideRequestPopupProps {
  request: RideRequest
  distanceMeters: number
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

export function RideRequestPopup({
  request,
  distanceMeters,
  onAccept,
  onReject,
}: RideRequestPopupProps) {
  const distanceText =
    distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Solicitud de ride"
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
    >
      <div className="rounded-2xl bg-surface border-2 border-primary shadow-xl p-5 max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden="true">
            🚨
          </span>
          <p className="font-bold text-foreground">Solicitud de ride</p>
        </div>

        {/* Info */}
        <div className="space-y-1 mb-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">Pasajero:</span>{" "}
            {request.pasajero?.nombre ?? "Anonimo"}
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium">Distancia al pickup:</span>{" "}
            {distanceText}
          </p>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onReject(request.id)}
          >
            Rechazar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onAccept(request.id)}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
