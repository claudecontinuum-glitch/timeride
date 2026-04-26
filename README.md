# TimeRide

> Taxis en tiempo real para Siguatepeque, Honduras.

Pasajeros ven taxis cercanos en el mapa, piden uno, y siguen al taxi en vivo
con ETA, foto del taxista, placa y color del vehiculo. Taxistas reciben las
solicitudes en su pantalla y aceptan con un tap.

**Beta activa:** [timeride-git-pivote-solo-taxis-alejandros-projects-4de18d02.vercel.app](https://timeride-git-pivote-solo-taxis-alejandros-projects-4de18d02.vercel.app)

---

## Stack

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Realtime-3ECF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)
![Leaflet](https://img.shields.io/badge/Leaflet-OpenStreetMap-199900?logo=leaflet)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?logo=vercel)

App web mobile-first. Cero dependencias de pago: Supabase free tier, Vercel
free tier, OpenStreetMap (OSS), Leaflet (OSS).

---

## Como correr localmente

```bash
git clone https://github.com/claudecontinuum-glitch/timeride.git
cd timeride
npm install
cp .env.example .env.local   # llenar con credenciales propias de Supabase
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Variables requeridas en `.env.local`:

| Variable | Descripcion |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key publica de Supabase |

---

## Documentacion del proyecto

Todo el detalle vive en el vault Alexandria, no aqui. El README solo
contiene lo que casi nunca cambia.

- **Producto:** alcance v1, lo que esta IN/OUT — `Alexandria/Proyectos/timeride/PRD.md`
- **Arquitectura:** stack detallado, paths, convenciones, gotchas — `Alexandria/Proyectos/timeride/CODEBASE.md`
- **Decisiones:** D1-D10 con contexto y por que cada una — `Alexandria/Proyectos/timeride/DECISIONES.md`
- **Diseno:** sistema visual v2, paleta, tipografia, animaciones — `Alexandria/Proyectos/timeride/DESIGN.md`
- **Diario:** historial de sesiones con decisiones del dia — `Alexandria/Proyectos/timeride/DIARIO.md`

Si encontras algo en el codigo que el README contradice, el codigo manda.
Si encontras algo que el CODEBASE.md contradice, el codigo manda y el
CODEBASE necesita actualizacion.

---

## Contexto

Proyecto co-creado con Adrian Oliva, estudiante de Entrepreneurship en
Siguatepeque. Demo en clase: 6 de mayo de 2026. Ale acompana como socio
tecnico mientras Adrian lleva la vision de producto y la conversacion
con usuarios reales en la ciudad.

---

## Licencia

Sin licencia publica todavia. Codigo privado para evaluacion interna.
