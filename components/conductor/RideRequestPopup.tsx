"use client"

import { Bell, X, Check } from "lucide-react"
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

  const initials = (request.pasajero?.nombre ?? "P")
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Solicitud de ride"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up"
    >
      <div className="surface-elevated rounded-2xl max-w-sm mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border">
          <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center">
            <Bell size={13} className="text-primary" strokeWidth={2.25} />
          </div>
          <p className="font-sans text-sm font-semibold text-foreground">
            Nueva solicitud
          </p>
        </div>

        {/* Pasajero */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-surface border border-border-strong flex items-center justify-center flex-shrink-0">
            <span className="font-sans text-xs font-semibold text-foreground">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-foreground truncate leading-tight">
              {request.pasajero?.nombre ?? "Pasajero"}
            </p>
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              <span className="font-mono tabular-nums">{distanceText}</span> al
              pickup
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onReject(request.id)}
          >
            <X size={15} strokeWidth={2.25} />
            Rechazar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onAccept(request.id)}
          >
            <Check size={15} strokeWidth={2.25} />
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
