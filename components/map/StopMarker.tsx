"use client"

import { Marker, Popup } from "react-leaflet"
import L from "leaflet"
import type { RouteStop } from "@/lib/types"

const stopIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -12],
})

interface StopMarkerProps {
  stop: RouteStop
}

export default function StopMarker({ stop }: StopMarkerProps) {
  return (
    <Marker position={[stop.lat, stop.lng]} icon={stopIcon}>
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">
            {stop.nombre_opcional ?? `Parada ${stop.seq}`}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}
