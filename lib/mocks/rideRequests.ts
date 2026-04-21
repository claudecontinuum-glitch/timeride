/**
 * Ride requests via localStorage + storage events.
 * Permite comunicación entre pestañas (pasajero + taxista en el mismo browser).
 * TODO Supabase: reemplazar todo esto por supabase.channel().on("postgres_changes")
 */

import type { RideRequest, RideRequestStatus } from "@/lib/types"

export const RIDE_REQUESTS_KEY = "timeride_ride_requests"

export function getRideRequests(): RideRequest[] {
  try {
    const raw = localStorage.getItem(RIDE_REQUESTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RideRequest[]
  } catch {
    return []
  }
}

function saveRideRequests(requests: RideRequest[]): void {
  localStorage.setItem(RIDE_REQUESTS_KEY, JSON.stringify(requests))
  // Disparar storage event en la misma pestaña (storage solo se emite en otras tabs)
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: RIDE_REQUESTS_KEY,
      newValue: JSON.stringify(requests),
    })
  )
}

export function createRideRequest(
  pasajeroId: string,
  pasajeroNombre: string,
  pasajeroTelefono: string | null,
  pickupLat: number,
  pickupLng: number
): RideRequest {
  const request: RideRequest = {
    id: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pasajero_id: pasajeroId,
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    status: "pending",
    accepted_by: null,
    created_at: new Date().toISOString(),
    accepted_at: null,
    pasajero: {
      nombre: pasajeroNombre,
      telefono: pasajeroTelefono,
    },
  }

  const requests = getRideRequests()
  // Cancelar requests previas pendientes del mismo pasajero
  const cleaned = requests.map((r) =>
    r.pasajero_id === pasajeroId && r.status === "pending"
      ? { ...r, status: "cancelled" as RideRequestStatus }
      : r
  )
  cleaned.push(request)
  saveRideRequests(cleaned)

  return request
}

export function acceptRideRequest(requestId: string, taxistaId: string): void {
  const requests = getRideRequests()
  const updated = requests.map((r) =>
    r.id === requestId
      ? { ...r, status: "accepted" as RideRequestStatus, accepted_by: taxistaId, accepted_at: new Date().toISOString() }
      : r
  )
  saveRideRequests(updated)
}

export function cancelRideRequest(requestId: string): void {
  const requests = getRideRequests()
  const updated = requests.map((r) =>
    r.id === requestId ? { ...r, status: "cancelled" as RideRequestStatus } : r
  )
  saveRideRequests(updated)
}

export function getActiveRequestForPasajero(pasajeroId: string): RideRequest | null {
  const requests = getRideRequests()
  // El más reciente que no esté cancelado/completado
  const active = requests
    .filter(
      (r) =>
        r.pasajero_id === pasajeroId &&
        (r.status === "pending" || r.status === "accepted")
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return active[0] ?? null
}

export function getPendingRequestsNearDriver(
  driverLat: number,
  driverLng: number,
  radiusM: number = 2000
): RideRequest[] {
  const requests = getRideRequests()
  return requests.filter((r) => {
    if (r.status !== "pending") return false
    const dist = haversineMeters(driverLat, driverLng, r.pickup_lat, r.pickup_lng)
    return dist <= radiusM
  })
}

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
