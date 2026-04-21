"use client"

import { useState, useRef, useCallback } from "react"
import type { RoutePath, RouteStop } from "@/lib/types"
import { LOCATION_UPDATE_INTERVAL_MS } from "@/lib/constants"

export type ShiftStatus = "idle" | "active"

interface UseDriverShiftReturn {
  status: ShiftStatus
  startedAt: Date | null
  pathPoints: RoutePath[]
  stops: RouteStop[]
  startShift: (position: { lat: number; lng: number }) => void
  stopShift: () => void
  registerStop: (position: { lat: number; lng: number }) => void
  updatePosition: (position: { lat: number; lng: number }) => void
}

let seqCounter = 0

/**
 * Hook de turno de conductor (bus/microbus).
 * Actualmente mock: acumula puntos localmente y loga a console.
 * TODO Supabase: reemplazar console.log por INSERT en driver_locations,
 * route_paths y route_stops usando getSupabaseBrowser().
 */
export function useDriverShift(): UseDriverShiftReturn {
  const [status, setStatus] = useState<ShiftStatus>("idle")
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [pathPoints, setPathPoints] = useState<RoutePath[]>([])
  const [stops, setStops] = useState<RouteStop[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const routeIdRef = useRef<string>("route-init")

  const updatePosition = useCallback(
    (position: { lat: number; lng: number }) => {
      currentPositionRef.current = position
    },
    []
  )

  const startShift = useCallback(
    (position: { lat: number; lng: number }) => {
      seqCounter = 0
      routeIdRef.current = `route-${Date.now()}`
      currentPositionRef.current = position
      setStatus("active")
      setStartedAt(new Date())
      setPathPoints([])
      setStops([])

      // TODO Supabase: INSERT routes + UPDATE driver_locations status=active
      console.log("Shift started", { routeId: routeIdRef.current, position })

      // Simula INSERT en route_paths cada LOCATION_UPDATE_INTERVAL_MS
      intervalRef.current = setInterval(() => {
        const pos = currentPositionRef.current
        if (!pos) return
        seqCounter++
        const point: RoutePath = {
          id: `rp-${Date.now()}`,
          route_id: routeIdRef.current,
          lat: pos.lat,
          lng: pos.lng,
          seq: seqCounter,
          recorded_at: new Date().toISOString(),
        }
        // TODO Supabase: await supabase.from("route_paths").insert(point)
        console.log("Mock INSERT route_paths", point)
        setPathPoints((prev) => [...prev, point])
      }, LOCATION_UPDATE_INTERVAL_MS)
    },
    []
  )

  const stopShift = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setStatus("idle")
    // TODO Supabase: UPDATE routes SET ended_at=now() + UPDATE driver_locations status=offline
    console.log("Shift stopped", { routeId: routeIdRef.current })
  }, [])

  const registerStop = useCallback(
    (position: { lat: number; lng: number }) => {
      const stopSeq = stops.length + 1
      const stop: RouteStop = {
        id: `stop-${Date.now()}`,
        route_id: routeIdRef.current,
        lat: position.lat,
        lng: position.lng,
        nombre_opcional: null,
        seq: stopSeq,
        recorded_at: new Date().toISOString(),
      }
      // TODO Supabase: await supabase.from("route_stops").insert(stop)
      console.log("Mock INSERT route_stops", stop)
      setStops((prev) => [...prev, stop])
    },
    [stops.length]
  )

  return {
    status,
    startedAt,
    pathPoints,
    stops,
    startShift,
    stopShift,
    registerStop,
    updatePosition,
  }
}
