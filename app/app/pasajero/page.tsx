"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useToast } from "@/components/ui/Toast"
import { useAuth } from "@/lib/mocks/auth"
import { useDriverLocations } from "@/hooks/useDriverLocations"
import { usePasajeroRideRequest } from "@/hooks/usePasajeroRideRequest"
import { getSupabaseBrowser } from "@/lib/supabase"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import type { DriverLocation, VehicleType, Route } from "@/lib/types"
import { Marker } from "react-leaflet"
import L from "leaflet"
import { SIGUA_CENTER } from "@/lib/constants"

// Dynamic imports para evitar SSR de Leaflet
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

const DriverMarker = dynamic(() => import("@/components/map/DriverMarker"), {
  ssr: false,
})

const RoutePath = dynamic(() => import("@/components/map/RoutePath"), {
  ssr: false,
})

const StopMarker = dynamic(() => import("@/components/map/StopMarker"), {
  ssr: false,
})

const VEHICLE_LABEL: Record<VehicleType, string> = {
  taxi: "Taxi",
  microbus: "Microbús",
  bus: "Bus",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Esperando taxi...",
  accepted: "¡Taxi en camino!",
  cancelled: "Cancelado",
  completed: "Completado",
}

function MyLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 2px 8px rgba(79,70,229,0.5)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

export default function PasajeroPage() {
  const { position, error: geoError, loading: geoLoading } = useGeolocation({ fallbackToCenter: true })
  const { addToast } = useToast()
  const { user, profile } = useAuth()

  // Conductores activos via Supabase Realtime
  const { drivers, error: driversError } = useDriverLocations(position)

  // Ride requests del pasajero via Supabase
  const {
    activeRide,
    createRideRequest,
    cancelRideRequest,
    loading: requestingRide,
  } = usePasajeroRideRequest(user?.id ?? null)

  // Conductor seleccionado — el sheet puede cerrarse pero la ruta queda visible
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Confirmación de pedir ride (segundo sheet)
  const [rideConfirmOpen, setRideConfirmOpen] = useState(false)

  // Ruta del conductor seleccionado
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const prevStatusRef = useRef<string | undefined>(undefined)

  // Notificar al pasajero cuando su ride es aceptado
  useEffect(() => {
    if (activeRide?.status === "accepted" && prevStatusRef.current !== "accepted") {
      addToast("¡Un taxi viene en camino!", "success")
    }
    prevStatusRef.current = activeRide?.status
  }, [activeRide?.status, addToast])

  // Toast si hay error cargando conductores (Supabase offline)
  useEffect(() => {
    if (driversError) {
      addToast("Sin conexión. Reintentando...", "error")
    }
  }, [driversError, addToast])

  // Cargar ruta del conductor seleccionado (microbus/bus)
  const fetchDriverRoute = useCallback(async (driverId: string) => {
    const supabase = getSupabaseBrowser()

    try {
      // Buscar ruta activa del conductor
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("id, driver_id, nombre, color, started_at, ended_at")
        .eq("driver_id", driverId)
        .is("ended_at", null)
        .single()

      if (routeError || !routeData) {
        setSelectedRoute(null)
        return
      }

      // Cargar path y paradas en paralelo
      const [pathResult, stopsResult] = await Promise.all([
        supabase
          .from("route_paths")
          .select("id, route_id, lat, lng, seq, recorded_at")
          .eq("route_id", routeData.id)
          .order("seq"),
        supabase
          .from("route_stops")
          .select("id, route_id, lat, lng, nombre_opcional, seq, recorded_at")
          .eq("route_id", routeData.id)
          .order("seq"),
      ])

      if (pathResult.error) {
        console.error("Failed to fetch route_paths", pathResult.error)
      }
      if (stopsResult.error) {
        console.error("Failed to fetch route_stops", stopsResult.error)
      }

      setSelectedRoute({
        ...routeData,
        path: pathResult.data ?? [],
        stops: stopsResult.data ?? [],
      })
    } catch (err) {
      console.error("Failed to fetch driver route", err)
      setSelectedRoute(null)
    }
  }, [])

  const handleDriverClick = useCallback((driver: DriverLocation) => {
    setSelectedDriver(driver)
    setSheetOpen(true)

    // Cargar ruta si es microbus/bus
    if (driver.profile?.vehicle_type && driver.profile.vehicle_type !== "taxi") {
      fetchDriverRoute(driver.driver_id)
    } else {
      setSelectedRoute(null)
    }
  }, [fetchDriverRoute])

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false)
    // NO limpiar selectedDriver — la ruta queda visible en el mapa
  }, [])

  const handleClearRoute = useCallback(() => {
    setSelectedDriver(null)
    setSelectedRoute(null)
    setSheetOpen(false)
  }, [])

  const handleRequestRide = useCallback(async () => {
    if (!user || !profile) return

    const lat = position?.lat ?? SIGUA_CENTER.lat
    const lng = position?.lng ?? SIGUA_CENTER.lng

    const ride = await createRideRequest(lat, lng)

    if (!ride) {
      addToast("No se pudo enviar la solicitud. Intenta de nuevo.", "error")
      return
    }

    setRideConfirmOpen(false)
    setSheetOpen(false)
    addToast("Solicitud enviada. Esperando conductor...", "success")
  }, [user, profile, position, createRideRequest, addToast])

  const handleCancelRide = useCallback(async () => {
    if (!activeRide) return
    await cancelRideRequest(activeRide.id)
    addToast("Solicitud cancelada.", "info")
  }, [activeRide, cancelRideRequest, addToast])

  const mapCenter = position
    ? { lat: position.lat, lng: position.lng }
    : SIGUA_CENTER

  const sheetTitle = selectedDriver?.profile
    ? `${VEHICLE_LABEL[selectedDriver.profile.vehicle_type ?? "taxi"]} — ${selectedDriver.profile.nombre}`
    : "Conductor"

  const isGeoDenied = !geoLoading && geoError !== null
  const noGeolocationSupport = typeof window !== "undefined" && !navigator.geolocation

  return (
    <div className="relative h-full w-full">
      {/* Banner offline */}
      {typeof window !== "undefined" && !window.navigator.onLine && (
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-danger text-danger-foreground text-xs text-center py-2 font-medium">
          Sin conexión a internet
        </div>
      )}

      {/* Mapa */}
      <MapView center={mapCenter}>
        {/* Mi ubicacion */}
        {position && (
          <MyLocationMarker lat={position.lat} lng={position.lng} />
        )}

        {/* Conductores activos */}
        {drivers.map((driver) => (
          <DriverMarker
            key={driver.driver_id}
            driver={driver}
            onClick={handleDriverClick}
          />
        ))}

        {/* Ruta del conductor seleccionado — persiste aunque el sheet esté cerrado */}
        {selectedRoute?.path && selectedRoute.path.length >= 2 && (
          <RoutePath
            points={selectedRoute.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
            color={selectedRoute.color}
          />
        )}

        {/* Paradas — persisten también */}
        {selectedRoute?.stops &&
          selectedRoute.stops.map((stop) => (
            <StopMarker key={stop.id} stop={stop} />
          ))}
      </MapView>

      {/* Chip flotante cuando hay ruta visible pero sheet cerrado */}
      {selectedDriver && !sheetOpen && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] animate-fade-in">
          <div className="flex items-center gap-2 bg-surface rounded-full shadow-lg px-4 py-2 border border-border">
            <span className="text-sm font-medium text-foreground max-w-[160px] truncate">
              {VEHICLE_LABEL[selectedDriver.profile?.vehicle_type ?? "taxi"]} — {selectedDriver.profile?.nombre}
            </span>
            <button
              onClick={handleClearRoute}
              className="min-w-[28px] min-h-[28px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-surface-hover ml-1"
              aria-label="Limpiar ruta"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mensaje sin conductores */}
      {drivers.length === 0 && !driversError && (
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="bg-surface rounded-2xl shadow-md px-4 py-4 text-center border border-border">
            <span className="text-2xl" aria-hidden="true">🔍</span>
            <p className="mt-2 text-sm font-medium text-foreground">
              No hay conductores activos cerca de ti
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vuelve en unos minutos.
            </p>
          </div>
        </div>
      )}

      {/* Error de geolocation — banner no bloqueante */}
      {isGeoDenied && (
        <div className="absolute top-3 left-4 right-4 z-[1000]">
          <div className="bg-surface border border-border rounded-2xl shadow-md px-4 py-3 flex items-start gap-3">
            <span className="text-lg mt-0.5" aria-hidden="true">📍</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {noGeolocationSupport
                  ? "Tu navegador no soporta geolocalización"
                  : "Necesitamos tu ubicación"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {noGeolocationSupport
                  ? "Usa un navegador actualizado (Chrome, Firefox, Safari)."
                  : "Activa la ubicación en tu navegador para ver conductores cerca de ti. El mapa muestra Siguatepeque."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card de ride activo en la parte inferior */}
      {activeRide && (activeRide.status === "pending" || activeRide.status === "accepted") && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 animate-slide-up">
          <div className={[
            "rounded-2xl border-2 shadow-xl px-4 py-4 max-w-sm mx-auto",
            activeRide.status === "accepted"
              ? "bg-success/10 border-success"
              : "bg-surface border-primary/40",
          ].join(" ")}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl" aria-hidden="true">
                {activeRide.status === "accepted" ? "🚕" : "⏳"}
              </span>
              <p className="font-semibold text-foreground">
                {STATUS_LABEL[activeRide.status]}
              </p>
            </div>

            {activeRide.status === "pending" && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-1"
                onClick={handleCancelRide}
              >
                Cancelar solicitud
              </Button>
            )}
            {activeRide.status === "accepted" && (
              <p className="text-sm text-muted-foreground">
                Un conductor aceptó tu solicitud y está de camino.
              </p>
            )}
          </div>
        </div>
      )}

      {/* BottomSheet de detalle de conductor */}
      <BottomSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        title={sheetTitle}
        blockBackground={false}
      >
        {selectedDriver && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Teléfono:</span>{" "}
                {selectedDriver.profile?.telefono ?? "No disponible"}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Estado:</span>{" "}
                {selectedDriver.status === "active" ? "En turno" : "Inactivo"}
              </p>
            </div>

            {selectedDriver.profile?.vehicle_type === "taxi" ? (
              <>
                {activeRide && (activeRide.status === "pending" || activeRide.status === "accepted") ? (
                  <div className="bg-surface-hover rounded-xl p-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Ya tienes una solicitud activa.
                    </p>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setRideConfirmOpen(true)}
                  >
                    Pedir ride aquí
                  </Button>
                )}
              </>
            ) : (
              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-sm text-muted-foreground text-center">
                  {selectedRoute
                    ? "Ruta visible en el mapa. Toca las paradas para ver nombres."
                    : "Este conductor no tiene una ruta activa registrada."}
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Sheet de confirmación de ride */}
      <BottomSheet
        open={rideConfirmOpen}
        onClose={() => setRideConfirmOpen(false)}
        title="Confirmar solicitud"
        blockBackground
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Los taxis cercanos verán tu ubicación actual y podrán aceptar tu solicitud.
          </p>
          <p className="text-xs text-muted-foreground bg-surface-hover rounded-xl px-3 py-2">
            📍 Pickup: {position ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` : "Siguatepeque (centro)"}
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setRideConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={requestingRide}
              onClick={handleRequestRide}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
