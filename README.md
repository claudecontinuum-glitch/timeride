# TimeRide

App de mobility hiper-local para Siguatepeque, Honduras.
Conductores publican ubicacion y rutas en vivo. Pasajeros ven conductores cercanos y piden taxis.

## Stack

- Next.js 16 App Router
- Supabase (Auth + Postgres + PostGIS + Realtime) — **pendiente conectar**
- Leaflet + OpenStreetMap (gratis)
- Tailwind CSS v4
- TypeScript strict

## Correr localmente

```bash
# 1. Instalar dependencias (ya instaladas si clonaste el repo)
npm install

# 2. Copiar env vars
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Correr dev server
npm run dev
```

Abrir http://localhost:3000

## Auth en modo mock

Mientras Supabase no este conectado, la app usa un mock de auth basado en cookies.
Para testear:

1. Ir a /signup y crear una cuenta con cualquier email/password
2. El onboarding te pregunta tu rol (pasajero / conductor)
3. Segun el rol, aterrizas en la pantalla correspondiente

El mock persiste entre recargas via localStorage + cookie.

## Env vars necesarias (cuando Supabase este listo)

| Variable | Descripcion |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key publica de Supabase |

## TODO para conectar Supabase

Los lugares exactos de integracion estan marcados con `// TODO Supabase:` en el codigo:

- `lib/mocks/auth.ts` — reemplazar `useAuth()` por hook real con `@supabase/ssr`
- `app/login/page.tsx` — `supabase.auth.signInWithPassword()`
- `app/signup/page.tsx` — `supabase.auth.signUp()`
- `app/onboarding/page.tsx` — `supabase.from("profiles").insert()`
- `hooks/useDriverShift.ts` — INSERT en `route_paths`, `route_stops`, UPDATE en `driver_locations`
- `hooks/useRideRequests.ts` — Supabase Realtime channel en `ride_requests`
- `app/app/pasajero/page.tsx` — `useDriverLocations()` hook con query `ST_DWithin`
- `app/app/settings/page.tsx` — `supabase.from("profiles").delete()` + `supabase.auth.signOut()`
- `proxy.ts` — validar sesion Supabase real en vez de cookie mock

## Estructura

```
app/                    # Next.js App Router
  layout.tsx            # Root layout
  page.tsx              # Landing con redirect segun auth
  login/                # Form login mock
  signup/               # Form signup mock
  onboarding/           # 2 pasos: rol + subtipo vehiculo
  app/
    layout.tsx          # Auth guard + NavBar
    pasajero/           # Mapa con conductores activos
    conductor/
      bus/              # Pantalla bus y microbus (turno + path + paradas)
      taxi/             # Pantalla taxi (disponibilidad + ride requests)
    settings/           # Info perfil + borrar perfil
components/
  map/                  # MapView, DriverMarker, RoutePath, StopMarker
  ui/                   # Button, Toast, RoleCard, BottomSheet
  conductor/            # StartShiftButton, RegisterStopButton, RideRequestPopup
hooks/                  # useGeolocation, useDriverShift, useRideRequests
lib/
  types.ts              # Tipos TypeScript del dominio
  constants.ts          # SIGUA_CENTER, radios, intervalos
  supabase.ts           # Browser client singleton
  supabase-server.ts    # Server client con cookies
  mocks/
    auth.ts             # Mock de auth (cookie-based)
    data.ts             # Datos mock: 3 conductores, 1 ruta
proxy.ts                # Middleware de auth (Next.js 16)
```
