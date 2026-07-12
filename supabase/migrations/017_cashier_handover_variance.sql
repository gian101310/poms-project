-- 017_cashier_handover_variance.sql
-- Adds cashier handover, received-correctly, and cash/card variance details.

begin;

alter table cash_reports add column if not exists turnover_to uuid references profiles(id);
alter table cash_reports add column if not exists received_correct boolean;
alter table cash_reports add column if not exists expected_cash numeric(10,2);
alter table cash_reports add column if not exists counted_cash numeric(10,2);
alter table cash_reports add column if not exists missing_amount numeric(10,2);
alter table cash_reports add column if not exists expected_card numeric(10,2);
alter table cash_reports add column if not exists actual_card numeric(10,2);
alter table cash_reports add column if not exists card_variance numeric(10,2);
alter table cash_reports add column if not exists card_tip_amount numeric(10,2);
alter table cash_reports add column if not exists shop_purchase_amount numeric(10,2);
alter table cash_reports add column if not exists variance_reason text;

commit;
