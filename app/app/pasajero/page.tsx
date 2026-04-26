"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { Loader2, Search, MapPin, Wifi, X } from "lucide-react"
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
    <div className="w-full h-full flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-2">
        <Loader2 size={20} className="text-muted-foreground animate-spin" />
        <p className="text-muted-foreground text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

const DriverMarker = dynamic(() => import("@/components/map/DriverMarker"), {
  ssr: false,
})

const STATUS_LABEL: Record<string, string> = {
  pending: "Buscando taxi",
  accepted: "Taxi asignado",
  en_route: "Taxi en camino",
  arrived: "Tu taxi llegó",
  completed: "Viaje completado",
  cancelled: "Cancelado",
}

function MyLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    html: `<div style="position:relative;width:16px;height:16px;"><div style="position:absolute;inset:0;border-radius:50%;background:#6366f1;opacity:0.25;animation:timeride-mylocation-pulse 2.4s ease-out infinite;"></div><div style="position:relative;width:14px;height:14px;border-radius:50%;background:#6366f1;border:2.5px solid #ededf0;box-shadow:0 2px 8px rgba(0,0,0,0.5);margin:1px;"></div></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  return <Marker position={[lat, lng]} icon={icon} />
}

let mylocationKeyframesInjected = false
function ensureMyLocationKeyframes() {
  if (mylocationKeyframesInjected || typeof document === "undefined") return
  mylocationKeyframesInjected = true
  if (document.getElementById("timeride-mylocation-keyframes")) return
  const style = document.createElement("style")
  style.id = "timeride-mylocation-keyframes"
  style.textContent = `@keyframes timeride-mylocation-pulse { 0% { transform: scale(1); opacity: 0.4; } 70% { transform: scale(2.5); opacity: 0; } 100% { transform: scale(2.5); opacity: 0; } }`
  document.head.appendChild(style)
}
ensureMyLocationKeyframes()

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
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-danger text-danger-foreground text-xs text-center py-2 font-medium font-sans flex items-center justify-center gap-1.5">
          <Wifi size={13} strokeWidth={2.25} />
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
          <div className="surface-elevated rounded-xl px-4 py-4 text-center">
            <Search size={20} className="text-muted-foreground mx-auto" strokeWidth={2} />
            <p className="mt-2 font-sans text-sm font-medium text-foreground">
              No hay taxis activos cerca de ti
            </p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              Vuelve en unos minutos.
            </p>
          </div>
        </div>
      )}

      {isGeoDenied && (
        <div className="absolute top-3 left-4 right-4 z-[1000]">
          <div className="surface-elevated rounded-xl px-4 py-3 flex items-start gap-3">
            <MapPin size={18} className="text-warning mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="font-sans text-sm font-medium text-foreground">
                {noGeolocationSupport
                  ? "Tu navegador no soporta geolocalización"
                  : "Necesitamos tu ubicación"}
              </p>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                {noGeolocationSupport
                  ? "Usa un navegador actualizado (Chrome, Firefox, Safari)."
                  : "Activa la ubicación en tu navegador para ver taxis cerca."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA flotante "Pedir taxi" — solo cuando no hay ride activo, ningun sheet abierto y no hay confirm en curso */}
      {!hasActiveRide && drivers.length > 0 && !sheetOpen && !rideConfirmOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-[100] p-4">
          <Button
            size="lg"
            className="w-full max-w-sm mx-auto"
            onClick={() => setRideConfirmOpen(true)}
          >
            <MapPin size={18} strokeWidth={2.25} />
            Pedir taxi aquí
          </Button>
        </div>
      )}

      {/* Card de ride activo */}
      {hasActiveRide && activeRide && (
        <div className="absolute bottom-0 left-0 right-0 z-[100] p-4 animate-slide-up">
          <div className="surface-elevated rounded-2xl max-w-sm mx-auto overflow-hidden">
            {/* Status header */}
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                {activeRide.status === "pending" ? (
                  <Loader2 size={14} className="text-primary animate-spin" strokeWidth={2.5} />
                ) : (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse-soft"
                    aria-hidden="true"
                  />
                )}
                <span className="font-sans text-xs font-medium text-foreground">
                  {STATUS_LABEL[activeRide.status]}
                </span>
              </div>
              {eta && taxiHighlightedStatus && (
                <div
                  className="flex items-baseline gap-1.5"
                  style={{ animation: "stagger-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both" }}
                >
                  <span className="font-sans text-[11px] text-muted-foreground">en</span>
                  <span className="font-mono text-base font-semibold text-foreground tabular-nums">
                    {eta.etaLabel}
                  </span>
                </div>
              )}
            </div>

            {taxiLocation?.profile && taxiHighlightedStatus && (
              <div
                className="flex items-center gap-3 px-4 py-3 border-t border-border"
                style={{ animation: "stagger-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both" }}
              >
                <div className="w-11 h-11 rounded-full bg-primary-soft border border-border-strong flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {taxiLocation.profile.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={taxiLocation.profile.photo_url}
                      alt={taxiLocation.profile.nombre}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="font-sans text-sm font-semibold text-foreground"
                      aria-hidden="true"
                    >
                      {taxiLocation.profile.nombre
                        .split(" ")
                        .map((n) => n.charAt(0))
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-semibold text-foreground truncate leading-tight">
                    {taxiLocation.profile.nombre}
                  </p>
                  <p className="font-sans text-xs text-muted-foreground mt-0.5">
                    {[
                      taxiLocation.profile.vehicle_model,
                      taxiLocation.profile.vehicle_color,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {taxiLocation.profile.license_plate && (
                  <div
                    className="flex-shrink-0 px-2.5 py-1 rounded-md bg-surface border border-border-strong"
                    aria-label="Placa"
                  >
                    <span className="font-mono text-[11px] font-semibold text-foreground tracking-wider">
                      {taxiLocation.profile.license_plate}
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeRide.status === "pending" && (
              <div className="px-4 pb-4 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleCancelRide}
                >
                  <X size={14} strokeWidth={2.25} />
                  Cancelar solicitud
                </Button>
              </div>
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
          <div className="space-y-3">
            <div className="space-y-2">
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
              {selectedDriver.profile?.vehicle_model && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Modelo:</span>{" "}
                  {selectedDriver.profile.vehicle_model}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Estado:</span>{" "}
                {selectedDriver.status === "active" ? "En turno" : "Inactivo"}
              </p>
            </div>

            <p className="text-xs text-muted-foreground bg-surface-hover rounded-xl px-3 py-2 mt-3">
              {hasActiveRide
                ? "Ya tienes una solicitud activa."
                : "Cualquier taxi cercano puede aceptar tu solicitud — no es necesario elegir uno específico."}
            </p>
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface rounded-lg px-3 py-2 border border-border">
            <MapPin size={13} strokeWidth={2} className="text-primary flex-shrink-0" />
            <span className="font-mono tabular-nums">
              {position
                ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
                : "Siguatepeque (centro)"}
            </span>
          </div>
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
