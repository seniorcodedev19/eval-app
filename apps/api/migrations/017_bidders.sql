-- Bidders: people who can be assigned to a profile alongside its assignees,
-- tracked with their own status. A bidder is a user flagged `is_bidder`, not
-- a new role, so the role column keeps meaning permissions only.
--
-- Bidders are deliberately left out of every weekly-metrics view
-- (/team-week, /review-queue, /time-team): they are not scored on the team's
-- metrics, so including them would show a column of empty weeks and drag the
-- team's averages down.
alter table users add column if not exists is_bidder boolean not null default false;

-- Which bidder is working a profile, and how far along they are. One bidder
-- per profile: a second assignment replaces the first.
alter table profiles add column if not exists bidder_id int references users(id) on delete set null;
alter table profiles add column if not exists bidder_status text not null default 'none';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_bidder_status_check') then
    alter table profiles add constraint profiles_bidder_status_check
      check (bidder_status in ('none','assigned','bidding','submitted','won','lost'));
  end if;
end $$;

create index if not exists profiles_bidder_idx on profiles (bidder_id);
create index if not exists users_bidder_idx on users (is_bidder) where is_bidder;

-- The default bidder the product ships with, so the feature is usable before
-- anyone configures it. Claimed by email: if that address already exists it
-- is flagged rather than duplicated, and the account has no password_hash, so
-- it cannot be signed into until someone sets one.
insert into users (email, name, role, is_bidder, active)
values ('bidder@teamhuddle.local', 'Default Bidder', 'member', true, true)
on conflict (email) do update set is_bidder = true;
