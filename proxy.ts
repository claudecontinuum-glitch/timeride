import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kjablgvjkzqiltysudzs.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYWJsZ3Zqa3pxaWx0eXN1ZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTA0NzgsImV4cCI6MjA5MjMyNjQ3OH0.OejkZbrTU1b8-R1rx8QG3ru0qyNeYqynizWBy6-OFH0"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding"]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith("/auth/")) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Solo proteger rutas /app/*
  if (!pathname.startsWith("/app/")) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Crear response mutable para que Supabase pueda refrescar cookies
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // getUser() valida el JWT contra Supabase — no confiar en cookie local
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
