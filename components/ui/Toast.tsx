"use client"

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react"

export interface ToastItem {
  id: string
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastItem["type"]) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback(
    (message: string, type: ToastItem["type"] = "info") => {
      const id = `toast-${Date.now()}`
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3500)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notificaciones"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(timer)
  }, [])

  const bgClass =
    toast.type === "success"
      ? "bg-emerald-600"
      : toast.type === "error"
      ? "bg-red-600"
      : "bg-slate-800"

  return (
    <div
      role="status"
      className={[
        "rounded-xl px-4 py-3 text-white text-sm font-medium shadow-lg",
        "transition-all duration-300",
        bgClass,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      ].join(" ")}
    >
      {toast.message}
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
