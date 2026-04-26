"use client"

import { useEffect, useState, useCallback } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase"
import type { DriverLocation, Profile } from "@/lib/types"

interface UseTaxiTrackingResult {
  taxiLocation: DriverLocation | null
  taxiProfile: Profile | null
  error: string | null
}

/**
 * Subscribe a la driver_location del taxista asignado a un ride aceptado.
 * Devuelve la posicion en vivo + el profile (con placa, color, foto) para
 * que el pasajero vea quien viene y dónde está.
 *
 * - Si taxistaId es null, no hace nada
 * - Re-fetches en cada cambio realtime de driver_locations.driver_id == taxistaId
 */
export function useTaxiTracking(
  taxistaId: string | null
): UseTaxiTrackingResult {
  const [taxiLocation, setTaxiLocation] = useState<DriverLocation | null>(null)
  const [taxiProfile, setTaxiProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!taxistaId) return

    const supabase = getSupabaseBrowser()

    try {
      // Profile (datos para mostrar al pasajero)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "user_id, role, nombre, telefono, license_plate, vehicle_color, vehicle_model, photo_url, role_locked_at, created_at"
        )
        .eq("user_id", taxistaId)
        .single()

      if (profileError) {
        console.error("Failed to fetch taxista profile", profileError)
        setError("No se pudo cargar la info del taxi")
      } else {
        setTaxiProfile(profileData as Profile)
      }

      // Driver location (posicion + heading + speed)
      const { data: locData, error: locError } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("driver_id", taxistaId)
        .maybeSingle()

      if (locError) {
        console.error("Failed to fetch taxista location", locError)
      } else if (locData) {
        setTaxiLocation({
          id: locData.driver_id,
          driver_id: locData.driver_id,
          lat: locData.lat,
          lng: locData.lng,
          heading: locData.heading,
          speed_kmh: locData.speed_kmh,
          status: locData.status,
          updated_at: locData.updated_at,
          profile: profileData as Profile,
        })
      }

      setError(null)
    } catch (err) {
      console.error("Failed to fetch taxi tracking data", err)
      setError("Error de conexión con el taxi")
    }
  }, [taxistaId])

  useEffect(() => {
    if (!taxistaId) return

    const supabase = getSupabaseBrowser()

    // fetchData es async — los setState ocurren post-await, no de forma sincrona.
    // El detector estatico de la regla no distingue, asi que lo silenciamos puntual.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()

    const channel = supabase
      .channel(`taxi_tracking_${taxistaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
          filter: `driver_id=eq.${taxistaId}`,
        },
        async (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          await fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taxistaId, fetchData])

  // Derivamos el output del taxistaId para no necesitar resetear state en effect
  // cuando el id desaparece (linter de React 19 lo bloquea).
  return {
    taxiLocation: taxistaId ? taxiLocation : null,
    taxiProfile: taxistaId ? taxiProfile : null,
    error,
  }
}
