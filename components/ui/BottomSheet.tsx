"use client"

import { ReactNode, useEffect, useRef } from "react"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  /**
   * blockBackground: cuando es true (default: false) agrega backdrop semiopaco.
   * Para el sheet de detalle del taxi NO queremos bloquear el mapa.
   * Para confirmaciones (pedir ride) sí queremos.
   */
  blockBackground?: boolean
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  blockBackground = false,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Solo bloqueamos el scroll del body cuando blockBackground=true
  useEffect(() => {
    if (!blockBackground) return
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open, blockBackground])

  if (!open) return null

  return (
    <>
      {/* Backdrop — solo si blockBackground=true */}
      {blockBackground && (
        <div
          className="fixed inset-0 z-[1100] bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sheet — z-index alineado con la semantica de bloqueo:
        * los sheets que bloquean el fondo (modales) van mas arriba que los
        * que no bloquean (info read-only). Asi nunca un detalle queda encima
        * de una confirmacion. */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Panel de detalle"}
        className={[
          "fixed bottom-0 left-0 right-0",
          blockBackground ? "z-[1110]" : "z-[1000]",
          "bg-surface rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.18)]",
          "max-h-[55vh] overflow-y-auto",
          "animate-slide-up",
        ].join(" ")}
      >
        {/* Handle de swipe */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
              aria-label="Cerrar panel"
            >
              ✕
            </button>
          </div>
        )}

        <div className="px-5 py-4">{children}</div>
      </div>
    </>
  )
}
