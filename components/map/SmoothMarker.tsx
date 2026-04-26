"use client"

import { useEffect, useRef, useState } from "react"
import { Marker } from "react-leaflet"
import { SMOOTH_ANIMATION_MS } from "@/lib/constants"

type LeafletIcon = NonNullable<
  React.ComponentProps<typeof Marker>["icon"]
>

interface SmoothMarkerProps {
  lat: number
  lng: number
  icon: LeafletIcon
  durationMs?: number
  eventHandlers?: {
    click?: () => void
  }
}

/**
 * Marker que interpola entre la posicion anterior y la nueva
 * usando requestAnimationFrame, en vez de saltar de golpe.
 *
 * Cuando el GPS reporta una nueva posicion del taxi, el marker se
 * desliza suavemente en `durationMs` milisegundos en vez de teleportar.
 */
export default function SmoothMarker({
  lat,
  lng,
  icon,
  durationMs = SMOOTH_ANIMATION_MS,
  eventHandlers,
}: SmoothMarkerProps) {
  const [displayPos, setDisplayPos] = useState<[number, number]>([lat, lng])
  const animFrameRef = useRef<number | null>(null)
  const fromPosRef = useRef<[number, number]>([lat, lng])
  const targetPosRef = useRef<[number, number]>([lat, lng])
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // Si la nueva posicion es identica a la actual, no animar.
    const [curLat, curLng] = displayPos
    if (curLat === lat && curLng === lng) return

    // Setup de la animacion
    fromPosRef.current = displayPos
    targetPosRef.current = [lat, lng]
    startTimeRef.current = null

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
    }

    function step(timestamp: number) {
      if (startTimeRef.current === null) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(1, elapsed / durationMs)

      // Easing simple: ease-out cuadratico para que llegue suavemente
      const eased = 1 - (1 - progress) * (1 - progress)

      const [fromLat, fromLng] = fromPosRef.current
      const [toLat, toLng] = targetPosRef.current
      const newLat = fromLat + (toLat - fromLat) * eased
      const newLng = fromLng + (toLng - fromLng) * eased

      setDisplayPos([newLat, newLng])

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        animFrameRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
    // displayPos intencional fuera de deps: solo reaccionamos a cambios externos de lat/lng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, durationMs])

  return (
    <Marker
      position={displayPos}
      icon={icon}
      eventHandlers={eventHandlers}
    />
  )
}
