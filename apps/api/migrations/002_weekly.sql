-- Move from quarterly periods to a weekly flow: daily input -> weekly report -> manager approval.
drop table if exists score_snapshots;
drop table if exists entries;
drop table if exists periods cascade;
delete from metrics;

alter table metrics
  add column team_id int references teams(id) on delete cascade,   -- null = applies to every team
  add column target numeric not null default 0 check (target >= 0), -- weekly target (ratio metrics)
  add column unit text not null default '',
  add column created_by int references users(id) on delete set null;

alter table users
  add column job_title text not null default '',
  add column bio text not null default '';

create table daily_entries (
  id bigserial primary key,
  user_id int not null references users(id) on delete cascade,
  metric_id int not null references metrics(id) on delete cascade,
  entry_date date not null,
  value numeric not null check (value > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, metric_id, entry_date)
);
create index daily_user_date_idx on daily_entries (user_id, entry_date);

create table weekly_reports (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  week_start date not null,                       -- always a Monday
  status text not null default 'draft' check (status in ('draft','submitted','approved','returned')),
  summary text,
  submitted_at timestamptz,
  reviewer_id int references users(id) on delete set null,
  reviewed_at timestamptz,
  review_comment text,
  bonus numeric not null default 0,
  total numeric,                                  -- final score, stored on approval
  achievement_pct numeric,
  breakdown jsonb,
  unique (user_id, week_start)
);
create index weekly_status_idx on weekly_reports (status);

create table time_logs (
  id bigserial primary key,
  user_id int not null references users(id) on delete cascade,
  log_date date not null,
  minutes int not null check (minutes > 0 and minutes <= 1440),
  task text not null,
  note text,
  created_at timestamptz not null default now()
);
create index time_user_date_idx on time_logs (user_id, log_date);

create table interviews (
  id serial primary key,
  member_id int not null references users(id) on delete cascade,
  interviewer_id int not null references users(id) on delete cascade,
  scheduled_at timestamptz not null,
  topic text not null default '1:1 review',
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);
create index interviews_member_idx on interviews (member_id, scheduled_at desc);
