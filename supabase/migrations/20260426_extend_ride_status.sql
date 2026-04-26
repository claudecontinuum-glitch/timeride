-- Extender ride_status enum con 'en_route' (taxi va al pickup) y 'arrived' (taxi llego)
-- Va separado del pivote porque ALTER TYPE ADD VALUE no soporta otros DDL en la misma
-- transaction de Postgres.

ALTER TYPE public.ride_status ADD VALUE IF NOT EXISTS 'en_route' AFTER 'accepted';
ALTER TYPE public.ride_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'en_route';
