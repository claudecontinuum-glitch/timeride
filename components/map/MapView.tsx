"use client"

import { ReactNode, useEffect } from "react"
import { MapContainer, TileLayer } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import { SIGUA_CENTER } from "@/lib/constants"

// Fix del icono default de Leaflet cuando se usa con webpack/Next.js
// Leaflet intenta acceder a window para calcular paths de iconos en SSR — esto
// se resuelve importando el fix aqui, dentro del componente client-only.
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const iconRetinaUrl = require("leaflet/dist/images/marker-icon-2x.png")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const iconUrl = require("leaflet/dist/images/marker-icon.png")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const shadowUrl = require("leaflet/dist/images/marker-shadow.png")

  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl.default ?? iconRetinaUrl,
    iconUrl: iconUrl.default ?? iconUrl,
    shadowUrl: shadowUrl.default ?? shadowUrl,
  })
}

interface MapViewProps {
  center?: { lat: number; lng: number }
  zoom?: number
  children?: ReactNode
  className?: string
}

export default function MapView({
  center = SIGUA_CENTER,
  zoom = 14,
  children,
  className = "",
}: MapViewProps) {
  useEffect(() => {
    fixLeafletIcons()
  }, [])

  const position: LatLngExpression = [center.lat, center.lng]

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      className={["w-full h-full", className].join(" ")}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      {children}
    </MapContainer>
  )
}
