-- Pivote 2026-04-26: simplificar TimeRide a solo taxis (no buses ni microbuses)
-- Cambios:
--  1) Drop policy "Taxistas accept requests" (depende de vehicle_type, recreada al final)
--  2) Drop tablas de rutas (routes, route_paths, route_stops)
--  3) DELETE driver_locations y ride_requests del microbus (huerfanos al borrar profile)
--  4) DELETE FROM profiles WHERE vehicle_type IN ('bus', 'microbus') -- 1 fila (gabrielandregarcia52)
--  5) Drop vehicle_type column + enum
--  6) Renombrar role 'conductor' -> 'taxista' (afecta a alexis.olivah y davidisaac.duarte)
--  7) Agregar columnas: license_plate, vehicle_color, vehicle_model, photo_url
--  8) Backfill placeholder en los 2 taxistas existentes (para que constraint quede VALID)
--  9) Recrear policy "Taxistas accept requests" usando role='taxista'
-- 10) Constraint: si role='taxista' requiere placa y color
-- Origen: Discord Adrian + maestro pidieron pivote a solo taxis (Diario 2026-04-26).
-- Sobreviven 5 cuentas autorizadas: alexis.olivah, davidisaac.duarte (taxistas placeholder),
-- onol4sco05, dvasquez, leobenjamin978 (pasajeros).

BEGIN;

DROP POLICY IF EXISTS "Taxistas accept requests" ON public.ride_requests;

DROP TABLE IF EXISTS public.route_paths CASCADE;
DROP TABLE IF EXISTS public.route_stops CASCADE;
DROP TABLE IF EXISTS public.routes CASCADE;

DELETE FROM public.driver_locations
WHERE driver_id IN (
  SELECT user_id FROM public.profiles WHERE vehicle_type IN ('bus', 'microbus')
);

DELETE FROM public.ride_requests
WHERE accepted_by IN (
  SELECT user_id FROM public.profiles WHERE vehicle_type IN ('bus', 'microbus')
);

DELETE FROM public.profiles WHERE vehicle_type IN ('bus', 'microbus');

ALTER TABLE public.profiles DROP COLUMN IF EXISTS vehicle_type;
DROP TYPE IF EXISTS public.vehicle_type_enum;

ALTER TYPE public.role_type RENAME VALUE 'conductor' TO 'taxista';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_plate text,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS photo_url text;

UPDATE public.profiles
SET license_plate = 'PENDIENTE',
    vehicle_color = 'pendiente'
WHERE role = 'taxista'::role_type AND license_plate IS NULL;

CREATE POLICY "Taxistas accept requests"
ON public.ride_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'taxista'::role_type
  )
)
WITH CHECK (
  accepted_by = auth.uid()
);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_taxista_requires_vehicle_info
  CHECK (
    role <> 'taxista'
    OR (license_plate IS NOT NULL AND vehicle_color IS NOT NULL)
  );

COMMIT;
