"use client"

import { useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useDriverShift } from "@/hooks/useDriverShift"
import { useAuth } from "@/lib/mocks/auth"
import { useToast } from "@/components/ui/Toast"
import { StartShiftButton } from "@/components/conductor/StartShiftButton"
import { RegisterStopButton } from "@/components/conductor/RegisterStopButton"
import { SIGUA_CENTER } from "@/lib/constants"
import { Marker } from "react-leaflet"
import L from "leaflet"

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-hover">
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl animate-pulse" aria-hidden="true">🗺️</span>
        <p className="text-muted-foreground text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

const RoutePath = dynamic(() => import("@/components/map/RoutePath"), {
  ssr: false,
})

const StopMarker = dynamic(() => import("@/components/map/StopMarker"), {
  ssr: false,
})

function MyMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 2px 8px rgba(99,102,241,0.5)"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export default function ConductorBusPage() {
  const { position, error: geoError, loading: geoLoading, startWatching, stopWatching } =
    useGeolocation({ fallbackToCenter: true })
  const { addToast } = useToast()
  const { user, profile } = useAuth()
  const shift = useDriverShift()

  // Cuando la posición cambia y hay turno activo, actualizar en el hook
  useEffect(() => {
    if (position && shift.status === "active") {
      shift.updatePosition({
        lat: position.lat,
        lng: position.lng,
        heading: position.heading,
        speed: position.speed,
      })
    }
  }, [position, shift])

  const handleStartShift = useCallback(async () => {
    if (!user || !profile) return

    const pos = position ?? SIGUA_CENTER
    startWatching()

    await shift.startShift(
      { lat: pos.lat, lng: pos.lng },
      user.id,
      profile.vehicle_type ?? "bus"
    )
    addToast("Turno iniciado. Tu ruta se está grabando.", "success")
  }, [position, startWatching, shift, addToast, user, profile])

  const handleStopShift = useCallback(async () => {
    stopWatching()
    await shift.stopShift()
    addToast("Turno finalizado. Ruta guardada.", "info")
  }, [stopWatching, shift, addToast])

  const handleRegisterStop = useCallback(async () => {
    if (!position) {
      addToast("No se pudo obtener tu ubicación.", "error")
      return
    }
    await shift.registerStop({ lat: position.lat, lng: position.lng })
    addToast("Parada registrada.", "success")
  }, [position, shift, addToast])

  const mapCenter = position ?? SIGUA_CENTER
  const noGeolocationSupport = typeof window !== "undefined" && !navigator.geolocation

  return (
    <div className="flex flex-col h-full">
      {/* Badge de turno activo */}
      {shift.status === "active" && shift.startedAt && (
        <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium">
          En turno desde {formatTime(shift.startedAt)} · {shift.stops.length} parada{shift.stops.length !== 1 ? "s" : ""} registrada{shift.stops.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Error de geolocation */}
      {!geoLoading && geoError && (
        <div className="px-4 py-2.5 bg-surface border-b border-border flex items-start gap-2.5">
          <span className="text-base mt-0.5" aria-hidden="true">📍</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {noGeolocationSupport
                ? "Tu navegador no soporta geolocalización"
                : "Ubicación no disponible"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {noGeolocationSupport
                ? "Actualiza tu navegador para usar esta función."
                : "El mapa muestra Siguatepeque. Activa la ubicación en tu navegador para grabar tu ruta real."}
            </p>
          </div>
        </div>
      )}

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapView center={mapCenter}>
          {/* Mi posicion */}
          {position && <MyMarker lat={position.lat} lng={position.lng} />}

          {/* Polyline del path grabado en vivo */}
          {shift.pathPoints.length >= 2 && (
            <RoutePath
              points={shift.pathPoints.map((p) => ({
                lat: p.lat,
                lng: p.lng,
              }))}
              color="#6366f1"
            />
          )}

          {/* Paradas registradas */}
          {shift.stops.map((stop) => (
            <StopMarker key={stop.id} stop={stop} />
          ))}
        </MapView>

        {/* CTA para conductor sin turno activo */}
        {shift.status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-surface/95 rounded-2xl px-5 py-5 shadow-lg text-center mx-6 border border-border">
              <span className="text-3xl" aria-hidden="true">🚌</span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Empieza tu turno
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                Presiona el botón de abajo para aparecer en el mapa de los pasajeros y grabar tu ruta.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Panel de controles inferior */}
      <div className="bg-surface border-t border-border px-4 py-4 space-y-3">
        {shift.status === "active" && (
          <RegisterStopButton
            onRegister={handleRegisterStop}
            disabled={!position}
          />
        )}

        <StartShiftButton
          active={shift.status === "active"}
          onStart={handleStartShift}
          onStop={handleStopShift}
        />
      </div>
    </div>
  )
}
