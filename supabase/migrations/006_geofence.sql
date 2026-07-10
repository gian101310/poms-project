-- ============================================================
-- POMS — Migration 006: Location-based login & clock security
-- Run AFTER 005 in the Supabase SQL editor.
-- ============================================================

alter table login_sessions add column if not exists latitude double precision;
alter table login_sessions add column if not exists longitude double precision;
alter table login_sessions add column if not exists geo_distance_m int;
alter table login_sessions add column if not exists flagged boolean not null default false;

-- Geofence settings (edit in Admin → Settings):
--   geofence_mode: "off" | "flag" (allow but mark) | "block" (refuse login/clock outside)
--   store_lat / store_lng: shop coordinates (right-click your shop in Google Maps → copy)
--   geofence_radius_m: allowed distance from the shop in meters
--   geo_exempt_roles: these roles can log in from anywhere
insert into app_settings (store_id, key, value)
select id, 'geofence_mode', '"off"'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
insert into app_settings (store_id, key, value)
select id, 'store_lat', '0'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
insert into app_settings (store_id, key, value)
select id, 'store_lng', '0'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
insert into app_settings (store_id, key, value)
select id, 'geofence_radius_m', '150'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
insert into app_settings (store_id, key, value)
select id, 'geo_exempt_roles', '["super_admin","manager"]'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
