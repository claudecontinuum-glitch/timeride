"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import type { DriverLocation } from "@/lib/types"
import { getSupabaseBrowser } from "@/lib/supabase"
import { DEFAULT_RADIUS_M } from "@/lib/constants"

/**
 * Calcula distancia en metros entre dos coordenadas (Haversine).
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

interface UseDriverLocationsReturn {
  drivers: DriverLocation[]
  loading: boolean
  error: string | null
}

/**
 * Hook que carga conductores activos cercanos y se suscribe a cambios via Realtime.
 * Filtra por radio haversine en cliente (la RPC drivers_nearby puede estar disponible en Supabase).
 */
export function useDriverLocations(
  center: { lat: number; lng: number } | null,
  radiusM: number = DEFAULT_RADIUS_M
): UseDriverLocationsReturn {
  const [drivers, setDrivers] = useState<DriverLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const centerRef = useRef(center)
  const radiusRef = useRef(radiusM)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const fetchDriversRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    centerRef.current = center
    radiusRef.current = radiusM
  }, [center, radiusM])

  const fetchDrivers = useCallback(async () => {
    const supabase = getSupabaseBrowser()

    try {
      // Intentar RPC primero; si falla (función no existe), caer en query directa
      let data: DriverLocation[] | null = null

      if (center) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("drivers_nearby", {
          center_lat: center.lat,
          center_lng: center.lng,
          radius_m: radiusM,
        })

        if (rpcError) {
          // RPC no existe todavía — usar query directa con join y filtrar en cliente
          console.error("drivers_nearby RPC failed, falling back to full query", rpcError)
        } else {
          data = rpcData as DriverLocation[]
        }
      }

      if (data === null) {
        // Fallback: traer todos los activos con su profile y filtrar por distancia en cliente
        const { data: rawData, error: queryError } = await supabase
          .from("driver_locations")
          .select("*, profiles!inner(*)")
          .eq("status", "active")

        if (queryError) {
          throw queryError
        }

        // Mapear joined data al tipo DriverLocation
        const mapped = (rawData ?? []).map((row: Record<string, unknown>) => ({
          id: row["driver_id"] as string,
          driver_id: row["driver_id"] as string,
          lat: row["lat"] as number,
          lng: row["lng"] as number,
          heading: row["heading"] as number | null,
          speed_kmh: row["speed_kmh"] as number | null,
          status: row["status"] as "active" | "offline",
          updated_at: row["updated_at"] as string,
          profile: row["profiles"] as DriverLocation["profile"],
        })) as DriverLocation[]

        // Filtrar por distancia si tenemos centro
        if (center) {
          data = mapped.filter(
            (d) => haversineMeters(center.lat, center.lng, d.lat, d.lng) <= radiusM
          )
        } else {
          data = mapped
        }
      }

      setDrivers(data ?? [])
      setError(null)
      retryCountRef.current = 0
    } catch (err) {
      console.error("Failed to fetch driver locations", err)
      setError("No hay conexión. Reintentando...")

      // Retry exponencial: 2s, 4s, 8s, máximo 16s
      const delay = Math.min(2000 * 2 ** retryCountRef.current, 16000)
      retryCountRef.current++
      retryTimeoutRef.current = setTimeout(() => {
        fetchDriversRef.current?.()
      }, delay)
    } finally {
      setLoading(false)
    }
  }, [center, radiusM])

  useEffect(() => {
    fetchDriversRef.current = fetchDrivers
  }, [fetchDrivers])

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    // Carga inicial — fetchDrivers es async, setState pasa post-await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDrivers()

    // Suscripción Realtime a cambios en driver_locations
    const channel = supabase
      .channel("driver_locations_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        async (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Re-fetch para obtener datos actualizados con profiles
          await fetchDrivers()
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel error on driver_locations")
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [fetchDrivers])

  return { drivers, loading, error }
}
