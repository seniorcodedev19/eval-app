create table teams (
  id serial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table users (
  id serial primary key,
  email text not null unique,
  name text not null default '',
  role text not null default 'member' check (role in ('admin','manager','member')),
  team_id int references teams(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table periods (
  id serial primary key,
  label text not null unique,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  locked boolean not null default false
);

create table metrics (
  id serial primary key,
  key text not null unique,
  name text not null,
  formula_type text not null check (formula_type in ('ratio','count')),
  weight numeric not null default 1,
  cap numeric not null default 1.2 check (cap > 0),
  active boolean not null default true
);

create table entries (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  period_id int not null references periods(id) on delete cascade,
  metric_id int not null references metrics(id) on delete cascade,
  planned numeric not null default 0 check (planned >= 0),
  done numeric not null default 0 check (done >= 0),
  bonus numeric not null default 0,
  note text,
  updated_by int references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, period_id, metric_id)
);

create table score_snapshots (
  user_id int not null references users(id) on delete cascade,
  period_id int not null references periods(id) on delete cascade,
  total numeric not null,
  base numeric not null,
  bonus numeric not null,
  achievement_pct numeric,
  breakdown jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, period_id)
);

create table audit_log (
  id bigserial primary key,
  actor_id int references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  at timestamptz not null default now()
);

create index entries_period_idx on entries (period_id, user_id);
create index audit_at_idx on audit_log (at desc);
