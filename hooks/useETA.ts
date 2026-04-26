"use client"

import { useMemo } from "react"
import { ASSUMED_TAXI_SPEED_KMH } from "@/lib/constants"

/**
 * Calcula la distancia haversine en metros entre dos coordenadas.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

interface ETAResult {
  /** Distancia en metros (haversine, linea recta — no por calle real) */
  distanceMeters: number
  /** Minutos estimados — minimo 1 si hay distancia */
  etaMinutes: number
  /** "1 min", "5 min", "12 min" */
  etaLabel: string
  /** "120 m", "1.4 km" */
  distanceLabel: string
}

/**
 * Calcula ETA aproximado entre dos puntos asumiendo velocidad promedio urbana.
 * Si no hay coordenadas validas, devuelve null.
 *
 * Notas:
 *  - Usa haversine (linea recta), no routing real. En ciudades chicas como
 *    Siguatepeque la diferencia es chica; en ciudades grandes habria que usar OSRM.
 *  - speedKmh override permite usar la velocidad real del GPS si esta disponible.
 */
export function useETA(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null,
  speedKmh: number = ASSUMED_TAXI_SPEED_KMH
): ETAResult | null {
  return useMemo(() => {
    if (!from || !to) return null
    if (speedKmh <= 0) return null

    const distanceMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng)

    // ETA en horas = distancia / velocidad
    const etaHours = distanceMeters / 1000 / speedKmh
    const etaMinutesRaw = etaHours * 60
    const etaMinutes = Math.max(1, Math.round(etaMinutesRaw))

    const etaLabel = `${etaMinutes} min`
    const distanceLabel =
      distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m`
        : `${(distanceMeters / 1000).toFixed(1)} km`

    return { distanceMeters, etaMinutes, etaLabel, distanceLabel }
  }, [from, to, speedKmh])
}
