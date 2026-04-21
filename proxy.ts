import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { MOCK_USER_COOKIE } from "@/lib/constants"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding"]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith("/auth/")) return true
  return false
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas protegidas: todo lo que empiece con /app/
  if (pathname.startsWith("/app/")) {
    const mockCookie = request.cookies.get(MOCK_USER_COOKIE)

    if (!mockCookie?.value) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Validar que el JSON del cookie sea parseable
    try {
      const decoded = decodeURIComponent(mockCookie.value)
      JSON.parse(decoded)
    } catch {
      // Cookie corrupto — borrar y redirigir
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete(MOCK_USER_COOKIE)
      return response
    }
  }

  return NextResponse.next()
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
