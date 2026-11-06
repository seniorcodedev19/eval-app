-- Narrow the bidder statuses to the three that are actually used:
-- none ("not assigned"), assigned, bidding. The submitted/won/lost states
-- from 017 tracked the outcome of a bid, which is not what this field is for.
--
-- Any profile already carrying a removed status falls back to 'bidding', the
-- furthest of the three along, so no row is left failing the new constraint.
update profiles set bidder_status = 'bidding'
 where bidder_status in ('submitted', 'won', 'lost');

alter table profiles drop constraint if exists profiles_bidder_status_check;
alter table profiles add constraint profiles_bidder_status_check
  check (bidder_status in ('none', 'assigned', 'bidding'));
