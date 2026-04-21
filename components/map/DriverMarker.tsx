"use client"

import { Marker, Popup } from "react-leaflet"
import L from "leaflet"
import type { DriverLocation, VehicleType } from "@/lib/types"

const VEHICLE_EMOJI: Record<VehicleType, string> = {
  taxi: "🚕",
  microbus: "🚐",
  bus: "🚌",
}

const VEHICLE_LABEL: Record<VehicleType, string> = {
  taxi: "Taxi",
  microbus: "Microbus",
  bus: "Bus",
}

function createVehicleIcon(type: VehicleType) {
  const emoji = VEHICLE_EMOJI[type]
  return L.divIcon({
    html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

interface DriverMarkerProps {
  driver: DriverLocation
  onClick?: (driver: DriverLocation) => void
}

export default function DriverMarker({ driver, onClick }: DriverMarkerProps) {
  if (!driver.profile?.vehicle_type) return null

  const icon = createVehicleIcon(driver.profile.vehicle_type)
  const label = VEHICLE_LABEL[driver.profile.vehicle_type]

  return (
    <Marker
      position={[driver.lat, driver.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(driver),
      }}
    >
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">{driver.profile.nombre}</p>
          <p className="text-muted-foreground">{label}</p>
        </div>
      </Popup>
    </Marker>
  )
}
