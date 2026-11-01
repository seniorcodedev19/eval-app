-- Slack app Client ID / Secret saved by an admin (never returned in full).

create table slack_app_config (
  id int primary key default 1 check (id = 1),
  client_id text not null default '',
  client_secret_enc text,
  updated_at timestamptz not null default now()
);

insert into slack_app_config (id) values (1);
