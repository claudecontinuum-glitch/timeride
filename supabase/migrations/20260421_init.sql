-- TimeRide — Initial schema
-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- =============================================================================
-- Enums
-- =============================================================================

create type role_type as enum ('pasajero', 'conductor');
create type vehicle_type_enum as enum ('taxi', 'microbus', 'bus');
create type driver_status as enum ('active', 'offline');
create type ride_status as enum ('pending', 'accepted', 'cancelled', 'completed');

-- =============================================================================
-- profiles
-- =============================================================================

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role role_type not null,
  vehicle_type vehicle_type_enum, -- null si role = pasajero
  nombre text not null,
  telefono text,
  created_at timestamptz default now(),
  role_locked_at timestamptz not null default now(),
  check (
    (role = 'conductor' and vehicle_type is not null) or
    (role = 'pasajero' and vehicle_type is null)
  )
);

alter table profiles enable row level security;

-- Read: any authenticated user can read any profile (needed to display conductores en el mapa)
create policy "Authenticated users can read profiles"
  on profiles for select
  to authenticated
  using (true);

-- Insert: user creates own profile once
create policy "Users insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update: user can update own profile but NOT role/vehicle_type (those are locked on insert)
create policy "Users update own profile except role"
  on profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enforce role/vehicle_type immutability via trigger
create or replace function prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if OLD.role is distinct from NEW.role then
    raise exception 'role cannot be changed — delete profile and create new';
  end if;
  if OLD.vehicle_type is distinct from NEW.vehicle_type then
    raise exception 'vehicle_type cannot be changed — delete profile and create new';
  end if;
  return NEW;
end;
$$;

create trigger enforce_role_lock
  before update on profiles
  for each row
  execute function prevent_role_change();

-- Delete: user can delete own profile (to reset and pick new role)
create policy "Users delete own profile"
  on profiles for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- driver_locations
-- =============================================================================

create table driver_locations (
  driver_id uuid primary key references profiles(user_id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision, -- grados 0-359, null si no disponible
  speed_kmh double precision,
  status driver_status not null default 'offline',
  location geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  updated_at timestamptz default now()
);

alter table driver_locations enable row level security;

-- Read: any authenticated can read active conductores (needed for map)
create policy "Authenticated read active drivers"
  on driver_locations for select
  to authenticated
  using (status = 'active');

-- Insert/Update/Delete: driver manages own location
create policy "Driver manages own location"
  on driver_locations for all
  to authenticated
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

-- Spatial index for ST_DWithin queries
create index idx_driver_locations_status_location on driver_locations using gist(status, location);

-- =============================================================================
-- routes (para microbus/bus — cada turno = una ruta)
-- =============================================================================

create table routes (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references profiles(user_id) on delete cascade,
  nombre text,
  color text default '#6366f1', -- default indigo-500
  started_at timestamptz default now(),
  ended_at timestamptz -- null si aun en curso
);

alter table routes enable row level security;

-- Read: any authenticated can read routes of active conductores
create policy "Authenticated read routes"
  on routes for select
  to authenticated
  using (true);

-- Write: driver manages own routes
create policy "Driver manages own routes"
  on routes for all
  to authenticated
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

create index idx_routes_driver_started on routes(driver_id, started_at desc);
create index idx_routes_active on routes(driver_id) where ended_at is null;

-- =============================================================================
-- route_paths (puntos de la trayectoria grabada)
-- =============================================================================

create table route_paths (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  seq integer not null,
  recorded_at timestamptz default now()
);

alter table route_paths enable row level security;

create policy "Authenticated read route_paths"
  on route_paths for select
  to authenticated
  using (true);

create policy "Driver manages own route_paths"
  on route_paths for all
  to authenticated
  using (
    exists (
      select 1 from routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  );

create index idx_route_paths_route_seq on route_paths(route_id, seq);

-- =============================================================================
-- route_stops (paradas identificadas por el conductor)
-- =============================================================================

create table route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  nombre_opcional text,
  seq integer not null,
  recorded_at timestamptz default now()
);

alter table route_stops enable row level security;

create policy "Authenticated read route_stops"
  on route_stops for select
  to authenticated
  using (true);

create policy "Driver manages own route_stops"
  on route_stops for all
  to authenticated
  using (
    exists (
      select 1 from routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  );

create index idx_route_stops_route_seq on route_stops(route_id, seq);

-- =============================================================================
-- ride_requests (solo para taxistas)
-- =============================================================================

create table ride_requests (
  id uuid primary key default gen_random_uuid(),
  pasajero_id uuid not null references profiles(user_id) on delete cascade,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_location geography(point, 4326) generated always as (st_setsrid(st_makepoint(pickup_lng, pickup_lat), 4326)::geography) stored,
  status ride_status not null default 'pending',
  accepted_by uuid references profiles(user_id) on delete set null,
  created_at timestamptz default now(),
  accepted_at timestamptz
);

alter table ride_requests enable row level security;

-- Pasajero: read/write own requests
create policy "Pasajero manages own requests"
  on ride_requests for all
  to authenticated
  using (auth.uid() = pasajero_id)
  with check (auth.uid() = pasajero_id);

-- Taxista: read pending requests (para que subscriba a los cercanos) + update para aceptar
create policy "Taxistas read pending requests"
  on ride_requests for select
  to authenticated
  using (
    status = 'pending' or accepted_by = auth.uid()
  );

create policy "Taxistas accept requests"
  on ride_requests for update
  to authenticated
  using (
    status = 'pending' and exists (
      select 1 from profiles p
      where p.user_id = auth.uid() and p.role = 'conductor' and p.vehicle_type = 'taxi'
    )
  )
  with check (
    accepted_by = auth.uid() and status = 'accepted'
  );

create index idx_ride_requests_status_location on ride_requests using gist(status, pickup_location);
create index idx_ride_requests_pasajero on ride_requests(pasajero_id, created_at desc);

-- =============================================================================
-- Enable realtime on critical tables
-- =============================================================================

alter publication supabase_realtime add table driver_locations;
alter publication supabase_realtime add table ride_requests;
alter publication supabase_realtime add table routes;
alter publication supabase_realtime add table route_paths;
alter publication supabase_realtime add table route_stops;
