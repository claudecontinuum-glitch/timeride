import type { DriverLocation, Route, RouteStop, RoutePath, RideRequest } from "@/lib/types"

/**
 * Mock data — 3 conductores activos en Siguatepeque.
 * Coordenadas reales de la ciudad para que el mapa se vea correcto.
 * Cuando Supabase este listo: reemplazar con queries a driver_locations via Realtime.
 */
export const MOCK_DRIVERS: DriverLocation[] = [
  {
    id: "dl-001",
    driver_id: "user-taxi-01",
    lat: 14.6075,
    lng: -87.8290,
    heading: 45,
    speed_kmh: 25,
    status: "active",
    updated_at: new Date().toISOString(),
    profile: {
      id: "profile-taxi-01",
      user_id: "user-taxi-01",
      nombre: "Carlos Mendez",
      telefono: "+504 9999-1111",
      role: "conductor",
      vehicle_type: "taxi",
      role_locked_at: "2026-04-21T10:00:00Z",
      created_at: "2026-04-21T10:00:00Z",
    },
  },
  {
    id: "dl-002",
    driver_id: "user-microbus-01",
    lat: 14.6048,
    lng: -87.8315,
    heading: 180,
    speed_kmh: 35,
    status: "active",
    updated_at: new Date().toISOString(),
    profile: {
      id: "profile-microbus-01",
      user_id: "user-microbus-01",
      nombre: "Maria Lopez",
      telefono: "+504 9999-2222",
      role: "conductor",
      vehicle_type: "microbus",
      role_locked_at: "2026-04-21T09:00:00Z",
      created_at: "2026-04-21T09:00:00Z",
    },
  },
  {
    id: "dl-003",
    driver_id: "user-bus-01",
    lat: 14.6090,
    lng: -87.8340,
    heading: 270,
    speed_kmh: 40,
    status: "active",
    updated_at: new Date().toISOString(),
    profile: {
      id: "profile-bus-01",
      user_id: "user-bus-01",
      nombre: "Jose Hernandez",
      telefono: "+504 9999-3333",
      role: "conductor",
      vehicle_type: "bus",
      role_locked_at: "2026-04-21T08:00:00Z",
      created_at: "2026-04-21T08:00:00Z",
    },
  },
]

/**
 * Paradas de la ruta de ejemplo (microbus).
 * Puntos reales en Siguatepeque: parque central, mercado, hospital.
 */
export const MOCK_ROUTE_STOPS: RouteStop[] = [
  {
    id: "stop-001",
    route_id: "route-001",
    lat: 14.6063,
    lng: -87.8301,
    nombre_opcional: "Parque Central",
    seq: 1,
    recorded_at: "2026-04-21T09:05:00Z",
  },
  {
    id: "stop-002",
    route_id: "route-001",
    lat: 14.6045,
    lng: -87.8280,
    nombre_opcional: "Mercado Municipal",
    seq: 2,
    recorded_at: "2026-04-21T09:12:00Z",
  },
  {
    id: "stop-003",
    route_id: "route-001",
    lat: 14.6100,
    lng: -87.8330,
    nombre_opcional: "Hospital",
    seq: 3,
    recorded_at: "2026-04-21T09:20:00Z",
  },
]

/**
 * Path de la ruta de ejemplo como polyline de puntos.
 * Simula la trayectoria grabada con watchPosition.
 */
export const MOCK_ROUTE_PATH: RoutePath[] = [
  { id: "rp-001", route_id: "route-001", lat: 14.6063, lng: -87.8301, seq: 1, recorded_at: "2026-04-21T09:05:00Z" },
  { id: "rp-002", route_id: "route-001", lat: 14.6058, lng: -87.8295, seq: 2, recorded_at: "2026-04-21T09:06:00Z" },
  { id: "rp-003", route_id: "route-001", lat: 14.6052, lng: -87.8290, seq: 3, recorded_at: "2026-04-21T09:07:00Z" },
  { id: "rp-004", route_id: "route-001", lat: 14.6045, lng: -87.8280, seq: 4, recorded_at: "2026-04-21T09:08:00Z" },
  { id: "rp-005", route_id: "route-001", lat: 14.6055, lng: -87.8295, seq: 5, recorded_at: "2026-04-21T09:12:00Z" },
  { id: "rp-006", route_id: "route-001", lat: 14.6068, lng: -87.8308, seq: 6, recorded_at: "2026-04-21T09:15:00Z" },
  { id: "rp-007", route_id: "route-001", lat: 14.6080, lng: -87.8320, seq: 7, recorded_at: "2026-04-21T09:17:00Z" },
  { id: "rp-008", route_id: "route-001", lat: 14.6090, lng: -87.8330, seq: 8, recorded_at: "2026-04-21T09:19:00Z" },
  { id: "rp-009", route_id: "route-001", lat: 14.6100, lng: -87.8330, seq: 9, recorded_at: "2026-04-21T09:20:00Z" },
]

export const MOCK_ROUTE: Route = {
  id: "route-001",
  driver_id: "user-microbus-01",
  nombre: "Ruta Parque-Mercado-Hospital",
  color: "#10b981",
  started_at: "2026-04-21T09:05:00Z",
  ended_at: null,
  stops: MOCK_ROUTE_STOPS,
  path: MOCK_ROUTE_PATH,
}

/**
 * Ride request de ejemplo para demo del flujo de taxi.
 * Simula un pasajero pidiendo un ride desde el Parque Central.
 */
export const MOCK_RIDE_REQUEST: RideRequest = {
  id: "rr-001",
  pasajero_id: "user-pasajero-01",
  pickup_lat: 14.6060,
  pickup_lng: -87.8298,
  status: "pending",
  accepted_by: null,
  created_at: new Date().toISOString(),
  accepted_at: null,
  pasajero: {
    nombre: "Ana Reyes",
    telefono: "+504 8888-1111",
  },
}
