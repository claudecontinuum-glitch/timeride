"use client"

import { useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Loader2, Eye, MapPin, Car, X } from "lucide-react"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useRideRequests } from "@/hooks/useRideRequests"
import { useAuth } from "@/lib/mocks/auth"
import { useToast } from "@/components/ui/Toast"
import { getSupabaseBrowser } from "@/lib/supabase"
import { RideRequestPopup } from "@/components/conductor/RideRequestPopup"
import { Button } from "@/components/ui/Button"
import { SIGUA_CENTER } from "@/lib/constants"
import { Marker, Polyline } from "react-leaflet"
import L from "leaflet"
import type { LatLngExpression } from "leaflet"

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-2">
        <Loader2 size={20} className="text-muted-foreground animate-spin" />
        <p className="text-muted-foreground text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

const TAXI_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <rect x="6" y="3" width="12" height="18" rx="3" fill="#facc15" stroke="#1c1917" stroke-width="1.5"/>
  <rect x="8" y="5" width="8" height="5" rx="1" fill="#1c1917"/>
  <rect x="8" y="14" width="8" height="5" rx="1" fill="#1c1917" opacity="0.5"/>
  <circle cx="12" cy="12" r="0.8" fill="#1c1917"/>
</svg>`

function MyMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#25252f;border:1.5px solid #6366f1;border-radius:50%;box-shadow:0 4px 14px rgba(99,102,241,0.4),0 0 0 1px rgba(0,0,0,0.4);">${TAXI_SVG}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

function PickupMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#f43f5e"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
    className: "",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
  const { position, error: geoError } = useGeolocation({ fallbackToCenter: true })
  const { user } = useAuth()
  const { addToast } = useToast()
  const {
    available,
    setAvailable,
    currentRequest,
    acceptRequest,
    rejectRequest,
    markEnRoute,
    markArrived,
    markCompleted,
    cancelByTaxista,
  } = useRideRequests(position)

  // Actualizar driver_locations en Supabase cuando la posición cambia y está disponible
  useEffect(() => {
    if (!available || !user || !position) return

    const supabase = getSupabaseBrowser()

    const updateLocation = async () => {
      try {
        await supabase.from("driver_locations").upsert({
          driver_id: user.id,
          lat: position.lat,
          lng: position.lng,
          heading: position.heading ?? null,
          speed_kmh: position.speed ?? null,
          status: "active",
          updated_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error("Failed to update taxi driver_location", err)
      }
    }

    updateLocation()
  }, [position, available, user])

  // Marcar offline al desactivar disponibilidad
  useEffect(() => {
    if (available || !user) return

    const supabase = getSupabaseBrowser()

    const markOffline = async () => {
      try {
        await supabase
          .from("driver_locations")
          .update({ status: "offline", updated_at: new Date().toISOString() })
          .eq("driver_id", user.id)
      } catch (err) {
        console.error("Failed to mark taxi offline", err)
      }
    }

    markOffline()
  }, [available, user])

  // Marcar offline al desmontar
  useEffect(() => {
    return () => {
      if (!user) return
      const supabase = getSupabaseBrowser()
      supabase
        .from("driver_locations")
        .update({ status: "offline", updated_at: new Date().toISOString() })
        .eq("driver_id", user.id)
        .then((result: { error: unknown }) => {
          if (result.error) console.error("Failed to mark taxi offline on unmount", result.error)
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAccept = useCallback(
    async (id: string) => {
      const taxistaId = user?.id ?? "unknown"
      await acceptRequest(id, taxistaId)
      addToast("Ride aceptado. Ve al punto de recogida.", "success")
    },
    [acceptRequest, addToast, user]
  )

  const handleReject = useCallback(
    (id: string) => {
      rejectRequest(id)
      addToast("Solicitud rechazada.", "info")
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

  // Línea del taxi al pickup cuando hay request activa
  const routeToPickup: LatLngExpression[] | null =
    currentRequest && position
      ? [
          [position.lat, position.lng],
          [currentRequest.pickup_lat, currentRequest.pickup_lng],
        ]
      : null

  const isRequestAccepted = currentRequest?.status === "accepted"
  const isEnRoute = currentRequest?.status === "en_route"
  const hasArrived = currentRequest?.status === "arrived"
  const inActiveTrip = isRequestAccepted || isEnRoute || hasArrived

  const handleMarkEnRoute = useCallback(async () => {
    if (!currentRequest) return
    await markEnRoute(currentRequest.id)
    addToast("En ruta al pasajero", "info")
  }, [currentRequest, markEnRoute, addToast])

  const handleMarkArrived = useCallback(async () => {
    if (!currentRequest) return
    await markArrived(currentRequest.id)
    addToast("Marcaste que llegaste al pasajero", "info")
  }, [currentRequest, markArrived, addToast])

  const handleMarkCompleted = useCallback(async () => {
    if (!currentRequest) return
    await markCompleted(currentRequest.id)
    addToast("Viaje completado", "success")
  }, [currentRequest, markCompleted, addToast])

  const handleCancelByTaxista = useCallback(async () => {
    if (!currentRequest) return
    await cancelByTaxista(currentRequest.id)
    addToast("Viaje cancelado", "info")
  }, [currentRequest, cancelByTaxista, addToast])

  return (
    <div className="flex flex-col h-full">
      {/* Toggle de disponibilidad */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {available ? "Disponible para rides" : "No disponible"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {available
              ? isRequestAccepted
                ? "Ve al punto de recogida"
                : "Esperando solicitudes cercanas..."
              : "Activa para recibir rides"}
          </p>
        </div>

        <button
          role="switch"
          aria-checked={available}
          disabled={!position}
          onClick={() => setAvailable(!available)}
          className={[
            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            !position ? "opacity-40 cursor-not-allowed" : "",
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

      {!position && !available && (
        <div className="px-4 py-2 bg-warning/10 border-b border-warning/30">
          <p className="text-xs text-foreground flex items-center gap-1.5">
            <MapPin size={12} className="text-warning flex-shrink-0" strokeWidth={2} aria-hidden="true" />
            Esperando ubicación... activa permisos de GPS para poder recibir rides.
          </p>
        </div>
      )}

      {/* Error de geolocation */}
      {geoError && (
        <div className="px-4 py-2 bg-surface border-b border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin size={12} className="flex-shrink-0" strokeWidth={2} aria-hidden="true" />
            Ubicación no disponible. Mapa centrado en Siguatepeque.
          </p>
        </div>
      )}

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapView center={mapCenter}>
          {/* Mi posicion */}
          {position && <MyMarker lat={position.lat} lng={position.lng} />}

          {/* Marcador del pickup */}
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
            <div className="surface-elevated rounded-xl px-5 py-5 text-center mx-6 max-w-[280px]">
              <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center mx-auto">
                <Car size={18} className="text-warning" strokeWidth={2} />
              </div>
              <p className="mt-3 text-sm font-sans font-semibold text-foreground">
                No estás disponible
              </p>
              <p className="text-xs font-sans text-muted-foreground mt-1.5 leading-snug">
                Activa el toggle de arriba para aparecer en el mapa y recibir solicitudes.
              </p>
            </div>
          </div>
        )}

        {/* Estado disponible pero sin requests */}
        {available && !currentRequest && (
          <div className="absolute top-3 left-4 right-4 pointer-events-none z-20">
            <div className="surface-elevated rounded-lg px-3 py-2 flex items-center justify-center gap-1.5">
              <Eye size={12} className="text-success" strokeWidth={2.25} />
              <p className="text-xs font-sans text-muted-foreground">
                Visible para pasajeros cercanos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Popup de ride request — solo cuando NO hay viaje activo en curso,
        * para evitar que el popup de pending coexista con el panel de
        * accepted/en_route/arrived durante el frame de transicion realtime. */}
      {currentRequest && currentRequest.status === "pending" && !inActiveTrip && (
        <RideRequestPopup
          request={currentRequest}
          distanceMeters={distanceToPickup}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* Panel de acciones segun estado del viaje */}
      {currentRequest && inActiveTrip && (
        <div className="surface-elevated border-t border-success px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-soft border border-border flex items-center justify-center flex-shrink-0">
              <span className="font-sans text-xs font-semibold text-foreground">
                {(currentRequest.pasajero?.nombre ?? "P")
                  .split(" ")
                  .map((n) => n.charAt(0))
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-semibold text-foreground truncate">
                {currentRequest.pasajero?.nombre ?? "Pasajero"}
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                {distanceToPickup < 1000
                  ? `${Math.round(distanceToPickup)} m al pickup`
                  : `${(distanceToPickup / 1000).toFixed(1)} km al pickup`}
                {" · "}
                {isRequestAccepted && "Aceptado"}
                {isEnRoute && "En ruta"}
                {hasArrived && "Llegaste"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {isRequestAccepted && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelByTaxista}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMarkEnRoute}
                >
                  Voy en camino
                </Button>
              </>
            )}
            {isEnRoute && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelByTaxista}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMarkArrived}
                >
                  Llegué al pickup
                </Button>
              </>
            )}
            {hasArrived && (
              <Button
                variant="primary"
                size="sm"
                className="col-span-2"
                onClick={handleMarkCompleted}
              >
                Finalizar viaje
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
