"use client"

import { useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
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
    <div className="w-full h-full flex items-center justify-center bg-surface-hover">
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl animate-pulse" aria-hidden="true">🗺️</span>
        <p className="text-muted-foreground text-sm">Cargando mapa...</p>
      </div>
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

      {/* Error de geolocation */}
      {geoError && (
        <div className="px-4 py-2 bg-surface border-b border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span aria-hidden="true">📍</span>
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
            <div className="bg-surface/95 rounded-2xl px-5 py-5 shadow-lg text-center mx-6 border border-border">
              <span className="text-3xl" aria-hidden="true">
                🟡
              </span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                No estás disponible
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                Activa el toggle de arriba para aparecer en el mapa de los pasajeros y recibir solicitudes.
              </p>
            </div>
          </div>
        )}

        {/* Estado disponible pero sin requests */}
        {available && !currentRequest && (
          <div className="absolute top-3 left-4 right-4 pointer-events-none z-20">
            <div className="bg-surface/90 rounded-xl px-4 py-2.5 shadow text-center border border-border">
              <p className="text-xs text-muted-foreground">
                <span aria-hidden="true">👁️</span> Visible para pasajeros cercanos
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
        <div className="bg-surface border-t-2 border-success px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">🚕</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {currentRequest.pasajero?.nombre ?? "Pasajero"}
              </p>
              <p className="text-xs text-muted-foreground">
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
