"use client"

import { useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useDriverShift } from "@/hooks/useDriverShift"
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
      <p className="text-muted-foreground text-sm">Cargando mapa...</p>
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
  const { position, startWatching, stopWatching } = useGeolocation({
    fallbackToCenter: true,
  })
  const { addToast } = useToast()
  const shift = useDriverShift()

  // Cuando la posicion cambia y hay turno activo, actualizar en el hook
  useEffect(() => {
    if (position && shift.status === "active") {
      shift.updatePosition({ lat: position.lat, lng: position.lng })
    }
  }, [position, shift])

  const handleStartShift = useCallback(() => {
    const pos = position ?? SIGUA_CENTER
    startWatching()
    shift.startShift({ lat: pos.lat, lng: pos.lng })
    addToast("Turno iniciado. Tu ruta se esta grabando.", "success")
  }, [position, startWatching, shift, addToast])

  const handleStopShift = useCallback(() => {
    stopWatching()
    shift.stopShift()
    addToast("Turno finalizado. Ruta guardada.", "info")
  }, [stopWatching, shift, addToast])

  const handleRegisterStop = useCallback(() => {
    if (!position) {
      addToast("No se pudo obtener tu ubicacion.", "error")
      return
    }
    shift.registerStop({ lat: position.lat, lng: position.lng })
    addToast("Parada registrada.", "success")
  }, [position, shift, addToast])

  const mapCenter = position ?? SIGUA_CENTER

  return (
    <div className="flex flex-col h-full">
      {/* Badge de turno activo */}
      {shift.status === "active" && shift.startedAt && (
        <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium">
          En turno desde {formatTime(shift.startedAt)} &middot;{" "}
          {shift.stops.length} paradas registradas
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
