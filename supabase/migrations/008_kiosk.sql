-- ============================================================
-- POMS — Migration 008: Kiosk key for the public QR display page
-- Run AFTER 007. The kiosk page shows the daily QR on the shop
-- POS without any logged-in session.
-- ============================================================
insert into app_settings (store_id, key, value)
select id, 'kiosk_key', to_jsonb(md5(gen_random_uuid()::text)) from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
