"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { RideRequest } from "@/lib/types"
import { MOCK_RIDE_REQUEST } from "@/lib/mocks/data"

const MOCK_REQUEST_INTERVAL_MS = 30000

interface UseRideRequestsReturn {
  available: boolean
  setAvailable: (v: boolean) => void
  currentRequest: RideRequest | null
  acceptRequest: (id: string) => void
  rejectRequest: (id: string) => void
}

/**
 * Hook de ride requests para taxista.
 * Mock: genera un ride_request simulado cada 30 seg cuando available=true.
 * TODO Supabase: reemplazar setInterval por supabase.channel("ride_requests")
 * .on("postgres_changes", ...) para recibir requests en realtime.
 */
export function useRideRequests(): UseRideRequestsReturn {
  const [available, setAvailableState] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<RideRequest | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const setAvailable = useCallback(
    (v: boolean) => {
      setAvailableState(v)
      if (!v) {
        stopSimulation()
        setCurrentRequest(null)
      }
    },
    [stopSimulation]
  )

  useEffect(() => {
    if (!available) return

    // TODO Supabase: suscribir a ride_requests WHERE status=pending
    // y filtrar por distancia al conductor
    intervalRef.current = setInterval(() => {
      // Solo mostrar nueva request si no hay una pendiente
      setCurrentRequest((prev) => {
        if (prev) return prev
        const mockRequest: RideRequest = {
          ...MOCK_RIDE_REQUEST,
          id: `rr-${Date.now()}`,
          created_at: new Date().toISOString(),
        }
        console.log("Mock realtime: new ride_request", mockRequest)
        return mockRequest
      })
    }, MOCK_REQUEST_INTERVAL_MS)

    return () => stopSimulation()
  }, [available, stopSimulation])

  const acceptRequest = useCallback((id: string) => {
    // TODO Supabase: UPDATE ride_requests SET status=accepted, accepted_by=user.id WHERE id=id
    console.log("Mock UPDATE ride_requests accepted", id)
    setCurrentRequest(null)
  }, [])

  const rejectRequest = useCallback((id: string) => {
    // TODO Supabase: UPDATE ride_requests SET status=cancelled WHERE id=id
    console.log("Mock UPDATE ride_requests rejected", id)
    setCurrentRequest(null)
  }, [])

  return {
    available,
    setAvailable,
    currentRequest,
    acceptRequest,
    rejectRequest,
  }
}
