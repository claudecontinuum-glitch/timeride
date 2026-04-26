"use client"

import { useEffect, useState } from "react"

interface WelcomeBannerProps {
  name: string
}

/**
 * Saludo personalizado que aparece sobre la pantalla los primeros 2 segundos
 * al abrir la app. Fade-out automatico. Solo se muestra una vez por carga
 * de pagina (sessionStorage), para no aparecer en cada navegacion interna.
 */
export function WelcomeBanner({ name }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const KEY = "timeride-welcome-shown"
    if (window.sessionStorage.getItem(KEY)) return
    window.sessionStorage.setItem(KEY, "1")
    setVisible(true)
    const t = window.setTimeout(() => setVisible(false), 2200)
    return () => window.clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[1300] flex items-start justify-center pt-24"
    >
      <div className="surface-elevated rounded-2xl px-6 py-3.5 animate-welcome-fade">
        <p className="font-sans text-sm text-foreground">
          Hola, <span className="font-semibold">{name}</span>.
        </p>
      </div>
    </div>
  )
}
