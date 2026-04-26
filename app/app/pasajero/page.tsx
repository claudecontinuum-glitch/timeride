"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useToast } from "@/components/ui/Toast"
import { useAuth } from "@/lib/mocks/auth"
import { useDriverLocations } from "@/hooks/useDriverLocations"
import { usePasajeroRideRequest } from "@/hooks/usePasajeroRideRequest"
import { useTaxiTracking } from "@/hooks/useTaxiTracking"
import { useETA } from "@/hooks/useETA"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import type { DriverLocation } from "@/lib/types"
import { Marker } from "react-leaflet"
import L from "leaflet"
import { SIGUA_CENTER } from "@/lib/constants"

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

const STATUS_LABEL: Record<string, string> = {
  pending: "Buscando taxi...",
  accepted: "Taxi asignado",
  en_route: "Taxi en camino",
  arrived: "Tu taxi llegó",
  completed: "Viaje completado",
  cancelled: "Cancelado",
}

function MyLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 0 0 4px rgba(79,70,229,0.25),0 2px 8px rgba(79,70,229,0.5)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

export default function PasajeroPage() {
  const { position, error: geoError, loading: geoLoading } = useGeolocation({
    fallbackToCenter: true,
  })
  const { addToast } = useToast()
  const { user, profile } = useAuth()

  const { drivers, error: driversError } = useDriverLocations(position)

  const {
    activeRide,
    createRideRequest,
    cancelRideRequest,
    loading: requestingRide,
  } = usePasajeroRideRequest(user?.id ?? null)

  // Tracking del taxi asignado (si hay activeRide aceptado)
  const taxistaId = activeRide?.accepted_by ?? null
  const { taxiLocation } = useTaxiTracking(taxistaId)

  // ETA del taxi al pickup point
  const pickupPoint = useMemo(() => {
    if (!activeRide) return null
    return { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng }
  }, [activeRide])

  const taxiPos = useMemo(
    () => (taxiLocation ? { lat: taxiLocation.lat, lng: taxiLocation.lng } : null),
    [taxiLocation]
  )

  const eta = useETA(taxiPos, pickupPoint)

  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [rideConfirmOpen, setRideConfirmOpen] = useState(false)
  const prevStatusRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (
      activeRide?.status === "accepted" &&
      prevStatusRef.current !== "accepted"
    ) {
      addToast("Un taxi aceptó tu solicitud", "success")
    }
    if (
      activeRide?.status === "arrived" &&
      prevStatusRef.current !== "arrived"
    ) {
      addToast("Tu taxi llegó", "success")
    }
    prevStatusRef.current = activeRide?.status
  }, [activeRide?.status, addToast])

  useEffect(() => {
    if (driversError) {
      addToast("Sin conexión. Reintentando...", "error")
    }
  }, [driversError, addToast])

  const handleDriverClick = useCallback((driver: DriverLocation) => {
    setSelectedDriver(driver)
    setSheetOpen(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
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
    addToast("Solicitud enviada. Esperando taxi...", "success")
  }, [user, profile, position, createRideRequest, addToast])

  const handleCancelRide = useCallback(async () => {
    if (!activeRide) return
    await cancelRideRequest(activeRide.id)
    addToast("Solicitud cancelada.", "info")
  }, [activeRide, cancelRideRequest, addToast])

  const mapCenter = position
    ? { lat: position.lat, lng: position.lng }
    : SIGUA_CENTER

  // Filtrar el taxi asignado del array de drivers (lo dibujamos por separado destacado)
  const driversToShow = useMemo(() => {
    if (!taxistaId) return drivers
    return drivers.filter((d) => d.driver_id !== taxistaId)
  }, [drivers, taxistaId])

  const sheetTitle = selectedDriver?.profile
    ? `Taxi — ${selectedDriver.profile.nombre}`
    : "Taxi"

  const isGeoDenied = !geoLoading && geoError !== null
  const noGeolocationSupport =
    typeof window !== "undefined" && !navigator.geolocation
  const hasActiveRide =
    activeRide &&
    (activeRide.status === "pending" ||
      activeRide.status === "accepted" ||
      activeRide.status === "en_route" ||
      activeRide.status === "arrived")

  const taxiHighlightedStatus = activeRide?.status === "accepted" || activeRide?.status === "en_route"

  return (
    <div className="relative h-full w-full">
      {typeof window !== "undefined" && !window.navigator.onLine && (
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-danger text-danger-foreground text-xs text-center py-2 font-medium">
          Sin conexión a internet
        </div>
      )}

      <MapView center={mapCenter}>
        {position && <MyLocationMarker lat={position.lat} lng={position.lng} />}

        {driversToShow.map((driver) => (
          <DriverMarker
            key={driver.driver_id}
            driver={driver}
            onClick={handleDriverClick}
          />
        ))}

        {/* Taxi asignado, destacado con animacion */}
        {taxiLocation && taxiHighlightedStatus && (
          <DriverMarker
            key={`assigned-${taxiLocation.driver_id}`}
            driver={taxiLocation}
            highlighted
          />
        )}
      </MapView>

      {drivers.length === 0 && !driversError && !hasActiveRide && (
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="bg-surface rounded-2xl shadow-md px-4 py-4 text-center border border-border">
            <span className="text-2xl" aria-hidden="true">🔍</span>
            <p className="mt-2 text-sm font-medium text-foreground">
              No hay taxis activos cerca de ti
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vuelve en unos minutos.
            </p>
          </div>
        </div>
      )}

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
                  : "Activa la ubicación en tu navegador para ver taxis cerca. El mapa muestra Siguatepeque."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA flotante "Pedir taxi" cuando no hay ride activo */}
      {!hasActiveRide && drivers.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4">
          <Button
            size="lg"
            className="w-full max-w-sm mx-auto shadow-xl"
            onClick={() => setRideConfirmOpen(true)}
          >
            🚕  Pedir taxi aquí
          </Button>
        </div>
      )}

      {/* Card de ride activo */}
      {hasActiveRide && activeRide && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 animate-slide-up">
          <div
            className={[
              "rounded-2xl border-2 shadow-xl px-4 py-4 max-w-sm mx-auto",
              activeRide.status === "pending"
                ? "bg-surface border-primary/40"
                : activeRide.status === "arrived"
                ? "bg-success/15 border-success"
                : "bg-success/10 border-success",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">
                  {activeRide.status === "pending"
                    ? "⏳"
                    : activeRide.status === "arrived"
                    ? "✅"
                    : "🚕"}
                </span>
                <p className="font-semibold text-foreground">
                  {STATUS_LABEL[activeRide.status]}
                </p>
              </div>
              {eta && taxiHighlightedStatus && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground leading-none">Llega en</p>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {eta.etaLabel}
                  </p>
                </div>
              )}
            </div>

            {taxiLocation?.profile && taxiHighlightedStatus && (
              <div className="bg-surface rounded-xl border border-border p-3 mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                  {taxiLocation.profile.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={taxiLocation.profile.photo_url}
                      alt={taxiLocation.profile.nombre}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">
                      {taxiLocation.profile.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {taxiLocation.profile.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {taxiLocation.profile.vehicle_color ?? "—"}
                    {taxiLocation.profile.license_plate
                      ? ` · ${taxiLocation.profile.license_plate}`
                      : ""}
                  </p>
                  {taxiLocation.profile.vehicle_model && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {taxiLocation.profile.vehicle_model}
                    </p>
                  )}
                </div>
                {eta && (
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    {eta.distanceLabel}
                  </div>
                )}
              </div>
            )}

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
          </div>
        </div>
      )}

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
              {selectedDriver.profile?.license_plate && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Placa:</span>{" "}
                  {selectedDriver.profile.license_plate}
                </p>
              )}
              {selectedDriver.profile?.vehicle_color && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Color:</span>{" "}
                  {selectedDriver.profile.vehicle_color}
                </p>
              )}
            </div>

            {hasActiveRide ? (
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
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={rideConfirmOpen}
        onClose={() => setRideConfirmOpen(false)}
        title="Confirmar solicitud"
        blockBackground
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Los taxis cercanos verán tu ubicación actual y podrán aceptar tu
            solicitud.
          </p>
          <p className="text-xs text-muted-foreground bg-surface-hover rounded-xl px-3 py-2">
            📍 Pickup:{" "}
            {position
              ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
              : "Siguatepeque (centro)"}
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
