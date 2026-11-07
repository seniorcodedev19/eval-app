-- Replace the 'on_hold' training status with 'ongoing', which sits between
-- 'approved' and 'rejected' in the board.
--
-- Any row still holding 'on_hold' becomes 'ongoing': a held account is work
-- that was started and not finished, which is what 'ongoing' now means. The
-- update runs before the constraint is swapped so no row is ever in breach.

update training_accounts set status = 'ongoing' where status = 'on_hold';

-- The original constraint was declared inline in 015, so Postgres named it
-- training_accounts_status_check. Drop by that name, and also drop the name
-- this migration creates, so re-running is harmless.
alter table training_accounts drop constraint if exists training_accounts_status_check;

alter table training_accounts add constraint training_accounts_status_check
  check (status in ('created', 'applied', 'approved', 'ongoing', 'rejected'));
