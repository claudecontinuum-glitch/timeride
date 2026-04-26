export type Role = "pasajero" | "taxista"

export type DriverStatus = "active" | "offline"

export type RideRequestStatus =
  | "pending"
  | "accepted"
  | "en_route"
  | "arrived"
  | "completed"
  | "cancelled"

export interface Profile {
  id: string
  user_id: string
  nombre: string
  telefono: string | null
  role: Role
  // Datos del vehiculo (solo si role === "taxista")
  license_plate: string | null
  vehicle_color: string | null
  vehicle_model: string | null
  photo_url: string | null
  role_locked_at: string | null
  created_at: string
}

export interface DriverLocation {
  id: string
  driver_id: string
  lat: number
  lng: number
  heading: number | null
  speed_kmh: number | null
  status: DriverStatus
  updated_at: string
  profile?: Profile
}

export interface RideRequest {
  id: string
  pasajero_id: string
  pickup_lat: number
  pickup_lng: number
  status: RideRequestStatus
  accepted_by: string | null
  created_at: string
  accepted_at: string | null
  pasajero?: Pick<Profile, "nombre" | "telefono">
  taxista?: Pick<
    Profile,
    "nombre" | "telefono" | "license_plate" | "vehicle_color" | "vehicle_model" | "photo_url"
  >
}

export interface MockUser {
  id: string
  email: string
}

export interface MockSession {
  user: MockUser
  profile: Profile | null
}
