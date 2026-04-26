"use client"

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

export interface ToastItem {
  id: string
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastItem["type"]) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback(
    (message: string, type: ToastItem["type"] = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
      setToasts((prev) => [...prev, { id, message, type }])
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toasts fijados arriba, centrados, sobre todo el contenido —
        * arriba en vez de abajo para no colisionar con los BottomSheets que
        * cubren la mitad inferior de la pantalla en mobile. */}
      <div
        aria-live="polite"
        aria-label="Notificaciones"
        className="fixed top-20 left-4 right-4 z-[1200] flex flex-col gap-2 items-center pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      // Esperar la transición de salida antes de eliminar del DOM
      setTimeout(() => onDismiss(toast.id), 300)
    }, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const config =
    toast.type === "success"
      ? { Icon: CheckCircle2, iconColor: "text-success" }
      : toast.type === "error"
      ? { Icon: AlertCircle, iconColor: "text-danger" }
      : { Icon: Info, iconColor: "text-primary" }
  const { Icon, iconColor } = config

  return (
    <div
      role="status"
      className={[
        "pointer-events-auto w-full max-w-sm",
        "surface-elevated rounded-xl px-3.5 py-3 text-foreground text-sm font-sans font-medium",
        "flex items-start justify-between gap-3",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3",
      ].join(" ")}
    >
      <span className="flex items-start gap-2.5 flex-1 min-w-0">
        <Icon size={16} className={`${iconColor} flex-shrink-0 mt-0.5`} strokeWidth={2.25} />
        <span className="leading-snug">{toast.message}</span>
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
        aria-label="Cerrar notificación"
      >
        <X size={14} strokeWidth={2.25} />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider")
  }
  return ctx
}
