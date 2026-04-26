"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
 *  - El ETA mostrado es **monotono decreciente** mientras el taxi se acerque.
 *    Si el taxi se aleja momentaneamente (gira en una calle, da una vuelta),
 *    el ETA mostrado mantiene el ultimo minimo en vez de subir y dar mala UX.
 *    Cuando vuelve a acercarse, baja desde donde estaba.
 *  - Si la distancia real cambia >50% respecto al display, descongelamos
 *    (probablemente el taxi se desvio mucho — mejor mostrar realidad).
 */
export function useETA(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null,
  speedKmh: number = ASSUMED_TAXI_SPEED_KMH
): ETAResult | null {
  const rawResult = useMemo(() => {
    if (!from || !to) return null
    if (speedKmh <= 0) return null

    const distanceMeters = haversineMeters(from.lat, from.lng, to.lat, to.lng)
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

  // Display monotono decreciente — el ETA en pantalla solo baja, salvo que
  // la realidad se desvie >50% (taxi cambio mucho de ruta).
  const displayedRef = useRef<ETAResult | null>(null)
  const [displayed, setDisplayed] = useState<ETAResult | null>(null)

  // Sync displayed con la regla monotona — los setState corren post-check de
  // rawResult, no son pure-trigger. eslint-disable justificado.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!rawResult) {
      displayedRef.current = null
      setDisplayed(null)
      return
    }
    const prev = displayedRef.current
    if (!prev) {
      displayedRef.current = rawResult
      setDisplayed(rawResult)
      return
    }
    const driftRatio =
      Math.abs(rawResult.distanceMeters - prev.distanceMeters) /
      Math.max(prev.distanceMeters, 1)

    // Caso A: el ETA real bajo o se mantuvo → adoptarlo
    if (rawResult.etaMinutes <= prev.etaMinutes) {
      displayedRef.current = rawResult
      setDisplayed(rawResult)
      return
    }

    // Caso B: drift grande (>50%) → adoptar realidad aunque suba (taxi se desvio mucho)
    if (driftRatio > 0.5) {
      displayedRef.current = rawResult
      setDisplayed(rawResult)
      return
    }

    // Caso C: subio chiquito → mantener display previo (no asusta al usuario)
  }, [rawResult])
  /* eslint-enable react-hooks/set-state-in-effect */

  return displayed
}
