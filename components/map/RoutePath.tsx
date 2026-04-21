"use client"

import { Polyline } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

interface RoutePathProps {
  points: { lat: number; lng: number }[]
  color?: string
  weight?: number
}

export default function RoutePath({
  points,
  color = "#6366f1",
  weight = 4,
}: RoutePathProps) {
  if (points.length < 2) return null

  const positions: LatLngExpression[] = points.map((p) => [p.lat, p.lng])

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color, weight, opacity: 0.85 }}
    />
  )
}
