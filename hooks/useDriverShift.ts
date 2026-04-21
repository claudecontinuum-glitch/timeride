"use client"

import { useState, useRef, useCallback } from "react"
import type { RoutePath, RouteStop } from "@/lib/types"
import { LOCATION_UPDATE_INTERVAL_MS } from "@/lib/constants"
import { getSupabaseBrowser } from "@/lib/supabase"

export type ShiftStatus = "idle" | "active"

interface UseDriverShiftReturn {
  status: ShiftStatus
  startedAt: Date | null
  pathPoints: RoutePath[]
  stops: RouteStop[]
  startShift: (position: { lat: number; lng: number }, userId: string, vehicleType: string) => Promise<void>
  stopShift: () => Promise<void>
  registerStop: (position: { lat: number; lng: number }) => Promise<void>
  updatePosition: (position: { lat: number; lng: number; heading?: number | null; speed?: number | null }) => void
}

let seqCounter = 0

/**
 * Hook de turno de conductor (microbus/bus).
 * Persiste en Supabase: routes, route_paths, route_stops, driver_locations.
 * Para taxi: solo actualiza driver_locations (sin grabar path).
 */
export function useDriverShift(): UseDriverShiftReturn {
  const [status, setStatus] = useState<ShiftStatus>("idle")
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [pathPoints, setPathPoints] = useState<RoutePath[]>([])
  const [stops, setStops] = useState<RouteStop[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentPositionRef = useRef<{
    lat: number
    lng: number
    heading?: number | null
    speed?: number | null
  } | null>(null)
  const routeIdRef = useRef<string | null>(null)
  const vehicleTypeRef = useRef<string>("bus")
  const userIdRef = useRef<string>("")

  const updatePosition = useCallback(
    (position: { lat: number; lng: number; heading?: number | null; speed?: number | null }) => {
      currentPositionRef.current = position
    },
    []
  )

  const startShift = useCallback(
    async (position: { lat: number; lng: number }, userId: string, vehicleType: string) => {
      const supabase = getSupabaseBrowser()
      seqCounter = 0
      currentPositionRef.current = position
      vehicleTypeRef.current = vehicleType
      userIdRef.current = userId

      try {
        // INSERT en routes (solo para microbus/bus)
        let routeId: string | null = null
        if (vehicleType !== "taxi") {
          const now = new Date()
          const routeName = `Turno ${now.toLocaleDateString("es-HN")} ${now.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit", hour12: true })}`

          const { data: routeData, error: routeError } = await supabase
            .from("routes")
            .insert({ driver_id: userId, nombre: routeName })
            .select("id")
            .single()

          if (routeError) {
            console.error("Failed to insert route", routeError)
          } else {
            routeId = routeData.id as string
          }
        }

        routeIdRef.current = routeId

        // UPSERT driver_locations
        const { error: locError } = await supabase
          .from("driver_locations")
          .upsert({
            driver_id: userId,
            lat: position.lat,
            lng: position.lng,
            heading: null,
            speed_kmh: null,
            status: "active",
            updated_at: new Date().toISOString(),
          })

        if (locError) {
          console.error("Failed to upsert driver_locations on shift start", locError)
        }
      } catch (err) {
        console.error("Unexpected error starting shift", err)
      }

      setStatus("active")
      setStartedAt(new Date())
      setPathPoints([])
      setStops([])

      // Intervalo de actualización de posición
      intervalRef.current = setInterval(async () => {
        const pos = currentPositionRef.current
        if (!pos) return

        const supabase = getSupabaseBrowser()

        // Actualizar driver_locations
        try {
          await supabase
            .from("driver_locations")
            .upsert({
              driver_id: userIdRef.current,
              lat: pos.lat,
              lng: pos.lng,
              heading: pos.heading ?? null,
              speed_kmh: pos.speed ?? null,
              status: "active",
              updated_at: new Date().toISOString(),
            })
        } catch (err) {
          console.error("Failed to update driver_locations", err)
        }

        // Grabar punto de ruta solo para microbus/bus
        if (vehicleTypeRef.current !== "taxi" && routeIdRef.current) {
          seqCounter++
          const point: Omit<RoutePath, "id"> = {
            route_id: routeIdRef.current,
            lat: pos.lat,
            lng: pos.lng,
            seq: seqCounter,
            recorded_at: new Date().toISOString(),
          }

          try {
            const { data, error } = await supabase
              .from("route_paths")
              .insert(point)
              .select("id")
              .single()

            if (error) {
              console.error("Failed to insert route_path", error)
            } else {
              const fullPoint: RoutePath = { ...point, id: data.id as string }
              setPathPoints((prev) => [...prev, fullPoint])
            }
          } catch (err) {
            console.error("Unexpected error inserting route_path", err)
          }
        }
      }, LOCATION_UPDATE_INTERVAL_MS)
    },
    []
  )

  const stopShift = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const supabase = getSupabaseBrowser()

    try {
      // Marcar driver como offline
      await supabase
        .from("driver_locations")
        .update({ status: "offline", updated_at: new Date().toISOString() })
        .eq("driver_id", userIdRef.current)

      // Cerrar la ruta si existe
      if (routeIdRef.current) {
        await supabase
          .from("routes")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", routeIdRef.current)
      }
    } catch (err) {
      console.error("Failed to close shift", err)
    }

    routeIdRef.current = null
    setStatus("idle")
  }, [])

  const registerStop = useCallback(
    async (position: { lat: number; lng: number }) => {
      if (!routeIdRef.current) return

      const supabase = getSupabaseBrowser()
      const stopSeq = stops.length + 1

      const stopData = {
        route_id: routeIdRef.current,
        lat: position.lat,
        lng: position.lng,
        nombre_opcional: null,
        seq: stopSeq,
        recorded_at: new Date().toISOString(),
      }

      try {
        const { data, error } = await supabase
          .from("route_stops")
          .insert(stopData)
          .select("id")
          .single()

        if (error) {
          console.error("Failed to insert route_stop", error)
          return
        }

        const fullStop: RouteStop = { ...stopData, id: data.id as string }
        setStops((prev) => [...prev, fullStop])
      } catch (err) {
        console.error("Unexpected error inserting route_stop", err)
      }
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
