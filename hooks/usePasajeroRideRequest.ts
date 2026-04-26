"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import type { RideRequest } from "@/lib/types"
import { getSupabaseBrowser } from "@/lib/supabase"

interface UsePasajeroRideRequestReturn {
  activeRide: RideRequest | null
  createRideRequest: (pickupLat: number, pickupLng: number) => Promise<RideRequest | null>
  cancelRideRequest: (id: string) => Promise<void>
  loading: boolean
}

/**
 * Hook de ride requests para pasajero.
 * Crea requests, cancela y suscribe a cambios en su propio request via Realtime.
 */
export function usePasajeroRideRequest(userId: string | null): UsePasajeroRideRequestReturn {
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof getSupabaseBrowser>["channel"] | null>(null)

  // Cargar ride activo al montar
  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowser()

    const fetchActive = async () => {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("pasajero_id", userId)
        .in("status", ["pending", "accepted", "en_route", "arrived"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Failed to fetch active ride request", error)
        }
        setActiveRide(null)
        return
      }

      setActiveRide(data as RideRequest)
    }

    fetchActive()

    // Suscribir a cambios del ride activo del pasajero
    const channel = supabase
      .channel(`ride_request_pasajero_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
          filter: `pasajero_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newRow = payload.new as Record<string, unknown>
          const newStatus = newRow["status"] as RideRequest["status"]
          setActiveRide((prev) => {
            if (!prev) return null
            if (prev.id !== newRow["id"]) return prev
            if (newStatus === "completed" || newStatus === "cancelled") {
              return null
            }
            return { ...prev, ...(newRow as Partial<RideRequest>) }
          })
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel error on ride_requests pasajero")
        }
        // Tras desconexion (wifi drop) o cierre del canal, resincronizar
        // desde BD para no quedarse pegado en un status stale (ej: el taxi
        // completo el viaje mientras el pasajero estaba offline).
        if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
          fetchActive()
        }
      })

    channelRef.current = channel

    // Resync al volver online (wifi drop) o al volver al foreground (tab change)
    const handleResync = () => {
      fetchActive()
    }
    window.addEventListener("online", handleResync)
    document.addEventListener("visibilitychange", handleResync)

    return () => {
      supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0])
      channelRef.current = null
      window.removeEventListener("online", handleResync)
      document.removeEventListener("visibilitychange", handleResync)
    }
  }, [userId])

  const createRideRequest = useCallback(
    async (pickupLat: number, pickupLng: number): Promise<RideRequest | null> => {
      if (!userId) return null

      const supabase = getSupabaseBrowser()
      setLoading(true)

      try {
        // Cancelar requests pendientes existentes del mismo pasajero
        await supabase
          .from("ride_requests")
          .update({ status: "cancelled" })
          .eq("pasajero_id", userId)
          .eq("status", "pending")

        // Crear nueva request
        const { data, error } = await supabase
          .from("ride_requests")
          .insert({
            pasajero_id: userId,
            pickup_lat: pickupLat,
            pickup_lng: pickupLng,
          })
          .select()
          .single()

        if (error) {
          console.error("Failed to create ride request", error)
          return null
        }

        const request = data as RideRequest
        setActiveRide(request)
        return request
      } catch (err) {
        console.error("Unexpected error creating ride request", err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  const cancelRideRequest = useCallback(
    async (id: string): Promise<void> => {
      const supabase = getSupabaseBrowser()

      try {
        const { error } = await supabase
          .from("ride_requests")
          .update({ status: "cancelled" })
          .eq("id", id)

        if (error) {
          console.error("Failed to cancel ride request", error)
          return
        }

        setActiveRide(null)
      } catch (err) {
        console.error("Unexpected error cancelling ride request", err)
      }
    },
    []
  )

  return { activeRide, createRideRequest, cancelRideRequest, loading }
}
