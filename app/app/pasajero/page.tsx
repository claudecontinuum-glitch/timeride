"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useToast } from "@/components/ui/Toast"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { MOCK_DRIVERS, MOCK_ROUTE } from "@/lib/mocks/data"
import type { DriverLocation, VehicleType } from "@/lib/types"
import { Marker } from "react-leaflet"
import L from "leaflet"
import { SIGUA_CENTER } from "@/lib/constants"

// Dynamic import para evitar SSR de Leaflet
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-hover">
      <p className="text-muted-foreground text-sm">Cargando mapa...</p>
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
  microbus: "Microbus",
  bus: "Bus",
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
  const { position } = useGeolocation({ fallbackToCenter: true })
  const { addToast } = useToast()

  // TODO Supabase: reemplazar MOCK_DRIVERS con useDriverLocations() hook
  // que suscribe a driver_locations via Realtime dentro del radio DEFAULT_RADIUS_M
  const [drivers] = useState<DriverLocation[]>(MOCK_DRIVERS)
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleDriverClick = useCallback((driver: DriverLocation) => {
    setSelectedDriver(driver)
    setSheetOpen(true)
  }, [])

  const handleRequestRide = useCallback(() => {
    // TODO Supabase: await supabase.from("ride_requests").insert({
    //   pasajero_id: user.id,
    //   pickup_lat: position.lat,
    //   pickup_lng: position.lng,
    //   status: "pending"
    // })
    console.log("Mock: ride_request created")
    addToast("Request enviada. Esperando conductor...", "success")
    setSheetOpen(false)
  }, [addToast])

  const mapCenter = position
    ? { lat: position.lat, lng: position.lng }
    : SIGUA_CENTER

  const selectedRoute =
    selectedDriver?.driver_id === MOCK_ROUTE.driver_id ? MOCK_ROUTE : null

  const sheetTitle = selectedDriver?.profile
    ? `${VEHICLE_LABEL[selectedDriver.profile.vehicle_type ?? "taxi"]} — ${selectedDriver.profile.nombre}`
    : "Conductor"

  return (
    <div className="relative h-full w-full">
      {/* Mapa */}
      <MapView center={mapCenter}>
        {/* Mi ubicacion */}
        {position && (
          <MyLocationMarker lat={position.lat} lng={position.lng} />
        )}

        {/* Conductores activos */}
        {drivers.map((driver) => (
          <DriverMarker
            key={driver.id}
            driver={driver}
            onClick={handleDriverClick}
          />
        ))}

        {/* Ruta del conductor seleccionado si es bus/microbus */}
        {selectedRoute?.path && sheetOpen && (
          <RoutePath
            points={selectedRoute.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
            color={selectedRoute.color}
          />
        )}

        {/* Paradas */}
        {selectedRoute?.stops && sheetOpen &&
          selectedRoute.stops.map((stop) => (
            <StopMarker key={stop.id} stop={stop} />
          ))}
      </MapView>

      {/* Indicador sin conductores */}
      {drivers.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-surface rounded-xl shadow px-4 py-2">
          <p className="text-sm text-muted-foreground text-center">
            No hay conductores activos cerca de ti
          </p>
        </div>
      )}

      {/* BottomSheet de detalle de conductor */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
      >
        {selectedDriver && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Telefono:</span>{" "}
                {selectedDriver.profile?.telefono ?? "No disponible"}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Estado:</span>{" "}
                {selectedDriver.status === "active" ? "En turno" : "Inactivo"}
              </p>
            </div>

            {selectedDriver.profile?.vehicle_type === "taxi" ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleRequestRide}
              >
                Pedir ride aqui
              </Button>
            ) : (
              <div className="bg-surface-hover rounded-xl p-3">
                <p className="text-sm text-muted-foreground text-center">
                  Ruta visible en el mapa. Toca las paradas para ver nombres.
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
