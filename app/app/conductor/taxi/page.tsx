"use client"

import { useCallback } from "react"
import dynamic from "next/dynamic"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useRideRequests } from "@/hooks/useRideRequests"
import { useToast } from "@/components/ui/Toast"
import { RideRequestPopup } from "@/components/conductor/RideRequestPopup"
import { SIGUA_CENTER } from "@/lib/constants"
import { Marker, Polyline } from "react-leaflet"
import L from "leaflet"
import type { LatLngExpression } from "leaflet"

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-hover">
      <p className="text-muted-foreground text-sm">Cargando mapa...</p>
    </div>
  ),
})

function MyMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="width:24px;height:24px;font-size:20px;line-height:24px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚕</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

function PickupMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="width:20px;height:20px;font-size:16px;line-height:20px;text-align:center">📍</div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ConductorTaxiPage() {
  const { position } = useGeolocation({ fallbackToCenter: true })
  const { addToast } = useToast()
  const { available, setAvailable, currentRequest, acceptRequest, rejectRequest } =
    useRideRequests()

  const handleAccept = useCallback(
    (id: string) => {
      acceptRequest(id)
      addToast("Ride aceptado. Ve al punto de recogida.", "success")
    },
    [acceptRequest, addToast]
  )

  const handleReject = useCallback(
    (id: string) => {
      rejectRequest(id)
      addToast("Request rechazada.", "info")
    },
    [rejectRequest, addToast]
  )

  const mapCenter = position ?? SIGUA_CENTER

  const distanceToPickup =
    currentRequest && position
      ? haversineMeters(
          position.lat,
          position.lng,
          currentRequest.pickup_lat,
          currentRequest.pickup_lng
        )
      : 0

  // Linea del taxi al pickup cuando se acepta
  const routeToPickup: LatLngExpression[] | null =
    currentRequest && position && available
      ? [
          [position.lat, position.lng],
          [currentRequest.pickup_lat, currentRequest.pickup_lng],
        ]
      : null

  return (
    <div className="flex flex-col h-full">
      {/* Toggle de disponibilidad */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {available ? "Disponible para rides" : "No disponible"}
          </p>
          <p className="text-xs text-muted-foreground">
            {available
              ? "Esperando solicitudes cercanas..."
              : "Activa para recibir rides"}
          </p>
        </div>

        <button
          role="switch"
          aria-checked={available}
          onClick={() => setAvailable(!available)}
          className={[
            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            available ? "bg-primary" : "bg-border",
          ].join(" ")}
          aria-label={available ? "Desactivar disponibilidad" : "Activar disponibilidad"}
        >
          <span
            className={[
              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              available ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapView center={mapCenter}>
          {/* Mi posicion */}
          {position && <MyMarker lat={position.lat} lng={position.lng} />}

          {/* Marcador del pickup aceptado */}
          {routeToPickup && currentRequest && (
            <>
              <PickupMarker
                lat={currentRequest.pickup_lat}
                lng={currentRequest.pickup_lng}
              />
              <Polyline
                positions={routeToPickup}
                pathOptions={{ color: "#f59e0b", weight: 3, dashArray: "8,6" }}
              />
            </>
          )}
        </MapView>

        {/* Estado sin disponibilidad */}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-surface/90 rounded-2xl px-5 py-4 shadow text-center mx-4">
              <span className="text-3xl" aria-hidden="true">
                🟡
              </span>
              <p className="mt-2 text-sm font-medium text-foreground">
                No estas disponible
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Activa el toggle para recibir solicitudes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Popup de ride request */}
      {currentRequest && (
        <RideRequestPopup
          request={currentRequest}
          distanceMeters={distanceToPickup}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
