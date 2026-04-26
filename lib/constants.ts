export const SIGUA_CENTER = { lat: 14.6063, lng: -87.8301 }

export const DEFAULT_RADIUS_M = 2000

export const LOCATION_UPDATE_INTERVAL_MS = 10000

export const MOCK_USER_COOKIE = "timeride_mock_user"

// Velocidad promedio de un taxi circulando en Siguatepeque (urbano).
// Usada para estimar ETA cuando no hay velocidad real reportada por el GPS.
export const ASSUMED_TAXI_SPEED_KMH = 30

// Duracion en milisegundos de la animacion de interpolacion entre
// posiciones consecutivas reportadas por el GPS del taxi.
export const SMOOTH_ANIMATION_MS = 1200
