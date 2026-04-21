-- TimeRide — RPC drivers_nearby
-- Retorna conductores activos dentro del radio dado (metros).
-- Usar ST_DWithin sobre la columna geography generada para eficiencia.

create or replace function drivers_nearby(
  center_lat double precision,
  center_lng double precision,
  radius_m integer default 2000
)
returns setof driver_locations
language sql
stable
security definer
as $$
  select dl.*
  from driver_locations dl
  where
    dl.status = 'active'
    and st_dwithin(
      dl.location,
      st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography,
      radius_m
    )
$$;

-- Permisos: cualquier usuario autenticado puede llamar la función
grant execute on function drivers_nearby(double precision, double precision, integer) to authenticated;
