"use client"

import { useEffect, useState } from "react"

/**
 * Aplica modo nocturno automatico entre 19:00 y 05:00 hora local.
 *
 * Pone la clase `night-mode` en el `<html>` cuando aplica. Los estilos del
 * tema en `globals.css` reaccionan a esa clase para cambiar el accent a tono
 * mas calido (rose/orange) durante la noche.
 *
 * Re-evalua cada minuto por si la sesion cruza el limite (ej. a las 19:00
 * exactas se activa sin requerir reload).
 */
export function useNightMode() {
  const [isNight, setIsNight] = useState(false)

  useEffect(() => {
    function evaluate() {
      const hour = new Date().getHours()
      const night = hour >= 19 || hour < 5
      setIsNight(night)
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("night-mode", night)
      }
    }
    evaluate()
    const interval = window.setInterval(evaluate, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  return isNight
}
