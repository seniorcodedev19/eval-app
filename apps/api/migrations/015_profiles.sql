-- Candidate/member profiles, the AI training sites they can hold accounts on,
-- and one account row per (profile, site).
--
-- A profile is its own record, not a column on users: anyone can create one
-- and assign it to themselves or to teammates, and one person may hold several.
-- Resume and interview-guide files are deliberately not here yet; the owner
-- parked file storage, so only link-free fields exist for now.

create table if not exists profiles (
  id serial primary key,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  linkedin_url text not null default '',
  notes text not null default '',
  created_by int references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who a profile belongs to. Many-to-many so a profile can be shared.
create table if not exists profile_assignees (
  profile_id int not null references profiles(id) on delete cascade,
  user_id int not null references users(id) on delete cascade,
  assigned_by int references users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (profile_id, user_id)
);

-- The AI training sites a profile can hold an account on. Admin-managed so
-- every column of the status matrix shares the same rows.
create table if not exists training_sites (
  id serial primary key,
  name text not null unique,
  url text not null default '',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- One account per profile per site: the cell of the status matrix.
create table if not exists training_accounts (
  id serial primary key,
  profile_id int not null references profiles(id) on delete cascade,
  site_id int not null references training_sites(id) on delete cascade,
  status text not null default 'created'
    check (status in ('created','applied','approved','rejected','on_hold')),
  account_email text not null default '',
  note text not null default '',
  updated_by int references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (profile_id, site_id)
);

create index if not exists profile_assignees_user_idx on profile_assignees (user_id);
create index if not exists training_accounts_profile_idx on training_accounts (profile_id);
create index if not exists training_accounts_site_idx on training_accounts (site_id);
