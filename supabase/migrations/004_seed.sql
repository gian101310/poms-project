-- ============================================================
-- POMS — Migration 004: Seed Data
-- Main store (Dubai), 9 departments, 3 shifts, default settings.
-- The first Super Admin account is created via server API
-- (service role) after this runs — see README.
-- ============================================================

insert into stores (id, name, code, timezone) values
  ('00000000-0000-0000-0000-000000000001', 'Main Store', 'MAIN', 'Asia/Dubai');

insert into departments (store_id, name, code, icon) values
  ('00000000-0000-0000-0000-000000000001','Birds','BIRDS','bird'),
  ('00000000-0000-0000-0000-000000000001','Dogs','DOGS','dog'),
  ('00000000-0000-0000-0000-000000000001','Cats','CATS','cat'),
  ('00000000-0000-0000-0000-000000000001','Small Animals','SMALL','rabbit'),
  ('00000000-0000-0000-0000-000000000001','Grooming','GROOM','scissors'),
  ('00000000-0000-0000-0000-000000000001','Boarding','BOARD','home'),
  ('00000000-0000-0000-0000-000000000001','Warehouse','WAREHOUSE','package'),
  ('00000000-0000-0000-0000-000000000001','Sales Floor','SALES','shopping-bag'),
  ('00000000-0000-0000-0000-000000000001','Cashier','CASHIER','credit-card');

insert into positions (title, level) values
  ('Super Admin','super_admin'),
  ('Store Manager','manager'),
  ('Department Supervisor','supervisor'),
  ('Animal Care Staff','staff'),
  ('Groomer','staff'),
  ('Sales Associate','staff'),
  ('Cashier','staff'),
  ('Warehouse Staff','staff');

-- Adjust times to actual store hours before go-live if needed.
insert into shifts (store_id, name, start_time, end_time, grace_minutes) values
  ('00000000-0000-0000-0000-000000000001','Opening','07:00','15:00',10),
  ('00000000-0000-0000-0000-000000000001','Mid Shift','11:00','19:00',10),
  ('00000000-0000-0000-0000-000000000001','Closing','14:00','22:00',10);

insert into app_settings (store_id, key, value) values
  ('00000000-0000-0000-0000-000000000001','overdue_threshold_minutes','60'),
  ('00000000-0000-0000-0000-000000000001','memo_ack_deadline_hours','48'),
  ('00000000-0000-0000-0000-000000000001','photo_max_mb','5'),
  ('00000000-0000-0000-0000-000000000001','session_inactivity_minutes','30'),
  ('00000000-0000-0000-0000-000000000001','absent_cutoff_time','"23:45"'),
  ('00000000-0000-0000-0000-000000000001','task_tags','["low_stock","maintenance","animal_health","cleaning","customer_concern","equipment"]');
