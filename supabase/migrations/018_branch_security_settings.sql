-- 018_branch_security_settings.sql
-- Make branch security/kiosk settings explicit for every active branch.

insert into app_settings (store_id, key, value)
select id, 'kiosk_key', to_jsonb(md5(gen_random_uuid()::text))
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'qr_login_mode', '"block"'::jsonb
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'qr_secret', to_jsonb(md5(gen_random_uuid()::text))
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'clock_ip_mode', '"off"'::jsonb
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'allowed_clock_ips', '""'::jsonb
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'geofence_mode', case when code = 'SPRINGS' then '"block"'::jsonb else '"off"'::jsonb end
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'store_lat', case when code = 'SPRINGS' then '25.065384'::jsonb else '0'::jsonb end
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'store_lng', case when code = 'SPRINGS' then '55.193346'::jsonb else '0'::jsonb end
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'geofence_radius_m', '150'::jsonb
from stores
where is_active = true
on conflict (store_id, key) do nothing;

insert into app_settings (store_id, key, value)
select id, 'geo_exempt_roles', '["super_admin","manager"]'::jsonb
from stores
where is_active = true
on conflict (store_id, key) do nothing;
