"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import type { RideRequest } from "@/lib/types"
import { getSupabaseBrowser } from "@/lib/supabase"
import { DEFAULT_RADIUS_M, SIGUA_CENTER } from "@/lib/constants"

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

interface UseRideRequestsReturn {
  available: boolean
  setAvailable: (v: boolean) => void
  currentRequest: RideRequest | null
  acceptRequest: (id: string, taxistaId: string) => Promise<void>
  rejectRequest: (id: string) => void
  markEnRoute: (id: string) => Promise<void>
  markArrived: (id: string) => Promise<void>
  markCompleted: (id: string) => Promise<void>
  cancelByTaxista: (id: string) => Promise<void>
}

/**
 * Hook de ride requests para taxista.
 * Suscripción Realtime a ride_requests con status=pending.
 * Filtra en cliente por distancia al taxista.
 */
export function useRideRequests(
  driverPosition?: { lat: number; lng: number } | null
): UseRideRequestsReturn {
  const [available, setAvailableState] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<RideRequest | null>(null)
  const currentRequestRef = useRef<RideRequest | null>(null)
  const positionRef = useRef(driverPosition ?? SIGUA_CENTER)
  const channelRef = useRef<ReturnType<typeof getSupabaseBrowser>["channel"] | null>(null)

  // Mantener ref sincronizada
  useEffect(() => {
    if (driverPosition) {
      positionRef.current = driverPosition
    }
  }, [driverPosition])

  useEffect(() => {
    currentRequestRef.current = currentRequest
  }, [currentRequest])

  const checkPendingRequests = useCallback(async () => {
    if (currentRequestRef.current) return

    const supabase = getSupabaseBrowser()
    const { lat, lng } = positionRef.current

    try {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*, profiles!pasajero_id(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Failed to fetch pending ride requests", error)
        return
      }

      // Filtrar por distancia en cliente
      const nearby = (data ?? [])
        .map((row: Record<string, unknown>) => ({
          id: row["id"] as string,
          pasajero_id: row["pasajero_id"] as string,
          pickup_lat: row["pickup_lat"] as number,
          pickup_lng: row["pickup_lng"] as number,
          status: row["status"] as RideRequest["status"],
          accepted_by: row["accepted_by"] as string | null,
          created_at: row["created_at"] as string,
          accepted_at: row["accepted_at"] as string | null,
          pasajero: row["profiles"] as RideRequest["pasajero"],
        }))
        .filter(
          (r: RideRequest) =>
            haversineMeters(lat, lng, r.pickup_lat, r.pickup_lng) <= DEFAULT_RADIUS_M
        )

      if (nearby.length > 0) {
        const newest = nearby[0] as RideRequest
        setCurrentRequest(newest)
        currentRequestRef.current = newest
      }
    } catch (err) {
      console.error("Unexpected error fetching ride requests", err)
    }
  }, [])

  const subscribeToRequests = useCallback(() => {
    const supabase = getSupabaseBrowser()

    const channel = supabase
      .channel("ride_requests_taxi")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_requests",
          filter: "status=eq.pending",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (currentRequestRef.current) return

          const row = payload.new as Record<string, unknown>
          const { lat, lng } = positionRef.current
          const pickupLat = row["pickup_lat"] as number
          const pickupLng = row["pickup_lng"] as number
          const dist = haversineMeters(lat, lng, pickupLat, pickupLng)

          if (dist <= DEFAULT_RADIUS_M) {
            const newRequest: RideRequest = {
              id: row["id"] as string,
              pasajero_id: row["pasajero_id"] as string,
              pickup_lat: pickupLat,
              pickup_lng: pickupLng,
              status: row["status"] as RideRequest["status"],
              accepted_by: row["accepted_by"] as string | null,
              created_at: row["created_at"] as string,
              accepted_at: row["accepted_at"] as string | null,
            }
            setCurrentRequest(newRequest)
            currentRequestRef.current = newRequest
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updated = payload.new as Record<string, unknown>
          if (currentRequestRef.current?.id === updated["id"]) {
            setCurrentRequest((prev) =>
              prev ? { ...prev, ...updated } as RideRequest : null
            )
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel error on ride_requests")
        }
      })

    channelRef.current = channel
    return channel
  }, [])

  const unsubscribe = useCallback(() => {
    const supabase = getSupabaseBrowser()
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current as Parameters<typeof supabase.removeChannel>[0])
      channelRef.current = null
    }
  }, [])

  const setAvailable = useCallback(
    (v: boolean) => {
      setAvailableState(v)
      if (!v) {
        setCurrentRequest(null)
        currentRequestRef.current = null
        unsubscribe()
      } else {
        // Buscar requests existentes + suscribir
        checkPendingRequests()
        subscribeToRequests()
      }
    },
    [checkPendingRequests, subscribeToRequests, unsubscribe]
  )

  // Limpiar suscripción al desmontar
  useEffect(() => {
    return () => {
      unsubscribe()
    }
  }, [unsubscribe])

  const acceptRequest = useCallback(async (id: string, taxistaId: string) => {
    const supabase = getSupabaseBrowser()

    try {
      const { data, error } = await supabase
        .from("ride_requests")
        .update({
          status: "accepted",
          accepted_by: taxistaId,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Failed to accept ride request", error)
        return
      }

      setCurrentRequest(data as RideRequest)
      currentRequestRef.current = data as RideRequest
    } catch (err) {
      console.error("Unexpected error accepting ride request", err)
    }
  }, [])

  const rejectRequest = useCallback((_id: string) => {
    // Solo ignoramos localmente — no cancelamos para que otro taxista pueda aceptar
    setCurrentRequest(null)
    currentRequestRef.current = null
  }, [])

  const updateStatus = useCallback(
    async (id: string, newStatus: RideRequest["status"]) => {
      const supabase = getSupabaseBrowser()
      try {
        const { data, error } = await supabase
          .from("ride_requests")
          .update({ status: newStatus })
          .eq("id", id)
          .select()
          .single()

        if (error) {
          console.error(`Failed to update ride to ${newStatus}`, error)
          return
        }

        if (newStatus === "completed" || newStatus === "cancelled") {
          setCurrentRequest(null)
          currentRequestRef.current = null
        } else {
          setCurrentRequest(data as RideRequest)
          currentRequestRef.current = data as RideRequest
        }
      } catch (err) {
        console.error(`Unexpected error updating ride to ${newStatus}`, err)
      }
    },
    []
  )

  const markEnRoute = useCallback((id: string) => updateStatus(id, "en_route"), [updateStatus])
  const markArrived = useCallback((id: string) => updateStatus(id, "arrived"), [updateStatus])
  const markCompleted = useCallback((id: string) => updateStatus(id, "completed"), [updateStatus])
  const cancelByTaxista = useCallback((id: string) => updateStatus(id, "cancelled"), [updateStatus])

  return {
    available,
    setAvailable,
    currentRequest,
    acceptRequest,
    rejectRequest,
    markEnRoute,
    markArrived,
    markCompleted,
    cancelByTaxista,
  }
}
