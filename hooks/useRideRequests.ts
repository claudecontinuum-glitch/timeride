"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { RideRequest } from "@/lib/types"
import {
  RIDE_REQUESTS_KEY,
  getRideRequests,
  acceptRideRequest,
  getPendingRequestsNearDriver,
} from "@/lib/mocks/rideRequests"
import { SIGUA_CENTER, DEFAULT_RADIUS_M } from "@/lib/constants"

interface UseRideRequestsReturn {
  available: boolean
  setAvailable: (v: boolean) => void
  currentRequest: RideRequest | null
  acceptRequest: (id: string, taxistaId: string) => void
  rejectRequest: (id: string) => void
}

/**
 * Hook de ride requests para taxista.
 * Lee de localStorage y escucha storage events para recibir requests en tiempo real
 * desde otra pestaña (donde el pasajero creó el request).
 * TODO Supabase: reemplazar por supabase.channel("ride_requests").on("postgres_changes")
 */
export function useRideRequests(
  driverPosition?: { lat: number; lng: number } | null
): UseRideRequestsReturn {
  const [available, setAvailableState] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<RideRequest | null>(null)
  const currentRequestRef = useRef<RideRequest | null>(null)
  const positionRef = useRef(driverPosition ?? SIGUA_CENTER)

  // Mantener ref sincronizada
  useEffect(() => {
    if (driverPosition) {
      positionRef.current = driverPosition
    }
  }, [driverPosition])

  useEffect(() => {
    currentRequestRef.current = currentRequest
  }, [currentRequest])

  const checkForNewRequests = useCallback(() => {
    // Si ya tenemos un request activo no buscar más
    if (currentRequestRef.current) return

    const { lat, lng } = positionRef.current
    const pending = getPendingRequestsNearDriver(lat, lng, DEFAULT_RADIUS_M)

    if (pending.length > 0) {
      const newest = pending.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      setCurrentRequest(newest)
      currentRequestRef.current = newest
    }
  }, [])

  const setAvailable = useCallback(
    (v: boolean) => {
      setAvailableState(v)
      if (!v) {
        setCurrentRequest(null)
        currentRequestRef.current = null
      } else {
        // Revisar inmediatamente si hay requests
        checkForNewRequests()
      }
    },
    [checkForNewRequests]
  )

  useEffect(() => {
    if (!available) return

    // Revisar al montar
    checkForNewRequests()

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== RIDE_REQUESTS_KEY) return
      checkForNewRequests()
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [available, checkForNewRequests])

  // Re-verificar periódicamente por si el storage event no llegó
  useEffect(() => {
    if (!available) return
    const interval = setInterval(checkForNewRequests, 5000)
    return () => clearInterval(interval)
  }, [available, checkForNewRequests])

  const acceptRequest = useCallback((id: string, taxistaId: string) => {
    // TODO Supabase: UPDATE ride_requests SET status=accepted, accepted_by=user.id WHERE id=id
    acceptRideRequest(id, taxistaId)
    // Mantener visible en la pantalla del taxista para que vea la ruta
    // (solo limpiamos el popup de "nueva request")
    const requests = getRideRequests()
    const accepted = requests.find((r) => r.id === id)
    if (accepted) {
      setCurrentRequest({ ...accepted })
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rejectRequest = useCallback((_id: string) => {
    // TODO Supabase: UPDATE ride_requests SET status=cancelled WHERE id=_id
    // Por ahora solo lo ignoramos localmente (no eliminamos para que otros taxistas puedan verlo)
    setCurrentRequest(null)
    currentRequestRef.current = null
  }, [])

  return {
    available,
    setAvailable,
    currentRequest,
    acceptRequest,
    rejectRequest,
  }
}
