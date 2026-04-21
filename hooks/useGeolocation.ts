"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SIGUA_CENTER } from "@/lib/constants"

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
  heading: number | null
  speed: number | null
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  watch?: boolean
  fallbackToCenter?: boolean
}

interface UseGeolocationReturn {
  position: GeoPosition | null
  error: string | null
  loading: boolean
  startWatching: () => void
  stopWatching: () => void
}

export function useGeolocation({
  enableHighAccuracy = true,
  watch = false,
  fallbackToCenter = true,
}: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const watchIdRef = useRef<number | null>(null)

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
    })
    setError(null)
    setLoading(false)
  }, [])

  const handleError = useCallback(
    (err: GeolocationPositionError) => {
      console.error("Geolocation error", err.message)
      setError("No se pudo obtener tu ubicacion. Verifica los permisos.")
      setLoading(false)
      if (fallbackToCenter) {
        setPosition({
          lat: SIGUA_CENTER.lat,
          lng: SIGUA_CENTER.lng,
          accuracy: 0,
          heading: null,
          speed: null,
        })
      }
    },
    [fallbackToCenter]
  )

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Tu dispositivo no soporta geolocation.")
      setLoading(false)
      return
    }
    stopWatching()
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, maximumAge: 5000, timeout: 15000 }
    )
  }, [enableHighAccuracy, handleSuccess, handleError, stopWatching])

  useEffect(() => {
    if (!navigator.geolocation) {
      // Usar queueMicrotask para evitar setState síncrono en useEffect
      const noGeoError = () => {
        setError("Tu dispositivo no soporta geolocation.")
        setLoading(false)
      }
      queueMicrotask(noGeoError)
      return
    }

    // Siempre obtenemos la posicion inicial con getCurrentPosition
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      maximumAge: 10000,
      timeout: 15000,
    })

    // Si watch=true, arrancamos watchPosition — queueMicrotask para evitar setState síncrono
    if (watch) {
      queueMicrotask(startWatching)
    }

    return () => {
      stopWatching()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { position, error, loading, startWatching, stopWatching }
}
