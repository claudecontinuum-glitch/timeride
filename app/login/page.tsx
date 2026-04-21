"use client"

import { useState, FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { setMockSession } from "@/lib/mocks/auth"
import { Button } from "@/components/ui/Button"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Completa todos los campos.")
      return
    }

    setLoading(true)

    try {
      // TODO Supabase: reemplazar por supabase.auth.signInWithPassword({ email, password })
      // y manejar el cookie de sesion real.
      // Por ahora: crear un mock user con el email ingresado.
      // El profile queda null — la page raiz redirigira a /onboarding si no hay profile.
      await new Promise((r) => setTimeout(r, 400)) // simular latencia de red

      const mockUser = {
        id: `user-${email.replace(/[^a-z0-9]/gi, "-")}`,
        email,
      }

      // Intentar recuperar un profile mock guardado en localStorage para persistencia
      let profile = null
      try {
        const stored = localStorage.getItem(`timeride_profile_${mockUser.id}`)
        if (stored) profile = JSON.parse(stored)
      } catch {
        // localStorage no disponible — normal en algunos contextos
      }

      setMockSession(mockUser, profile)
      router.push(redirect)
    } catch (err) {
      console.error("Login failed", err)
      setError("No se pudo iniciar sesion. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-5xl" aria-hidden="true">
            🚦
          </span>
          <h1 className="mt-3 text-2xl font-bold text-foreground">TimeRide</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transporte en Siguatepeque
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                         transition-colors text-base"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                         transition-colors text-base"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full mt-2"
          >
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No tienes cuenta?{" "}
          <a
            href="/signup"
            className="text-primary font-medium hover:underline"
          >
            Registrate
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
