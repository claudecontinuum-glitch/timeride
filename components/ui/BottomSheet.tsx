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

  // Cerrar con Escape + mover foco al sheet al abrir (WCAG 2.4.3 — Focus Order).
  useEffect(() => {
    if (!open) return
    sheetRef.current?.focus()
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

      {/* Sheet — glass effect con blur + glow superior */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Panel de detalle"}
        className={[
          "fixed bottom-0 left-0 right-0",
          blockBackground ? "z-[1110]" : "z-[1000]",
          "glass-surface rounded-t-2xl",
          "max-h-[55vh] overflow-y-auto",
          "animate-slide-up",
        ].join(" ")}
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        {/* Handle de swipe */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
            <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
              aria-label="Cerrar panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 py-4">{children}</div>
      </div>
    </>
  )
}
