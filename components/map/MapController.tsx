"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"

interface MapControllerProps {
  /**
   * Si esta presente, el mapa centra (con animacion suave) en estas
   * coordenadas. Util para "follow camera" del taxi asignado mientras se
   * mueve hacia el pasajero.
   */
  followLat?: number | null
  followLng?: number | null
  /**
   * Punto al que volver cuando ya no hay follow (por ejemplo cuando el ride
   * termina o se cancela). Si null, no se mueve al perder follow.
   */
  fallbackLat?: number | null
  fallbackLng?: number | null
  /** Zoom a aplicar cuando seguimos. Default: 16. */
  followZoom?: number
}

export default function MapController({
  followLat,
  followLng,
  fallbackLat,
  fallbackLng,
  followZoom = 16,
}: MapControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (followLat != null && followLng != null) {
      map.flyTo([followLat, followLng], followZoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      })
      return
    }
    if (fallbackLat != null && fallbackLng != null) {
      map.flyTo([fallbackLat, fallbackLng], map.getZoom(), {
        duration: 0.8,
        easeLinearity: 0.25,
      })
    }
  }, [map, followLat, followLng, fallbackLat, fallbackLng, followZoom])

  return null
}
