"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

interface RideCompletedStickerProps {
  show: boolean
  onDismiss: () => void
}

/**
 * Overlay tipo "sticker" que aparece al cerrar un viaje. Muestra el wordmark
 * de TimeRide + un mensaje de cierre. Auto-dismiss a los 2.8 segundos para
 * que el pasajero vuelva al mapa sin friccion.
 */
export function RideCompletedSticker({ show, onDismiss }: RideCompletedStickerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) {
      setVisible(false)
      return
    }
    const tShow = window.setTimeout(() => setVisible(true), 50)
    const tDismiss = window.setTimeout(() => {
      setVisible(false)
      window.setTimeout(onDismiss, 320)
    }, 2800)
    return () => {
      window.clearTimeout(tShow)
      window.clearTimeout(tDismiss)
    }
  }, [show, onDismiss])

  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div
        className={[
          "surface-elevated rounded-3xl px-8 py-7 max-w-xs mx-4 text-center transition-all duration-300",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
      >
        <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-success" strokeWidth={2.25} />
        </div>
        <p className="font-sans text-base font-semibold text-foreground">
          Viaje completado
        </p>
        <p className="font-sans text-sm text-muted-foreground mt-1.5">
          Gracias por viajar con
        </p>
        <p className="font-sans text-lg font-bold text-foreground mt-2 tracking-tight">
          TimeRide
        </p>
      </div>
    </div>
  )
}
