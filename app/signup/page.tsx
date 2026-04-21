"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { setMockSession } from "@/lib/mocks/auth"
import { Button } from "@/components/ui/Button"

export default function SignupPage() {
  const router = useRouter()

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

    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.")
      return
    }

    setLoading(true)

    try {
      // TODO Supabase: reemplazar por supabase.auth.signUp({ email, password })
      // Supabase crea el user y devuelve la sesion. Con el user.id, el trigger
      // de la DB crea automaticamente el profile.
      await new Promise((r) => setTimeout(r, 500)) // simular latencia

      const mockUser = {
        id: `user-${Date.now()}`,
        email,
      }

      // Usuario recien creado — sin profile todavia
      setMockSession(mockUser, null)

      // Guardar referencia para que login futuro pueda recuperar el profile
      // (una vez que el usuario complete el onboarding)
      localStorage.setItem(`timeride_user_${mockUser.id}`, JSON.stringify(mockUser))

      // Redirige a onboarding para que elija su rol
      router.push("/onboarding")
    } catch (err) {
      console.error("Signup failed", err)
      setError("No se pudo crear la cuenta. Intenta de nuevo.")
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
            Crea tu cuenta
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                         transition-colors text-base"
              placeholder="Minimo 6 caracteres"
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
            Crear cuenta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ya tienes cuenta?{" "}
          <a
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Inicia sesion
          </a>
        </p>
      </div>
    </div>
  )
}
