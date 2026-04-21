export type Role = "pasajero" | "conductor"

export type VehicleType = "taxi" | "microbus" | "bus"

export type DriverStatus = "active" | "offline"

export type RideRequestStatus = "pending" | "accepted" | "cancelled" | "completed"

export interface Profile {
  id: string
  user_id: string
  nombre: string
  telefono: string | null
  role: Role
  vehicle_type: VehicleType | null
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

export interface RouteStop {
  id: string
  route_id: string
  lat: number
  lng: number
  nombre_opcional: string | null
  seq: number
  recorded_at: string
}

export interface RoutePath {
  id: string
  route_id: string
  lat: number
  lng: number
  seq: number
  recorded_at: string
}

export interface Route {
  id: string
  driver_id: string
  nombre: string
  color: string
  started_at: string
  ended_at: string | null
  stops?: RouteStop[]
  path?: RoutePath[]
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
}

export interface MockUser {
  id: string
  email: string
}

export interface MockSession {
  user: MockUser
  profile: Profile | null
}
